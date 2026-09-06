import { useEffect, useRef, useState } from "react"
import Map from "./components/Map"
import { supabase } from "./lib/supabaseClient"

function App() {
  const [stories, setStories] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [showForm, setShowForm] = useState(false)

  const [authorName, setAuthorName] = useState("")
  const [memoryDate, setMemoryDate] = useState("")
  const [category, setCategory] = useState("")
  const [placeName, setPlaceName] = useState("")
  const [title, setTitle] = useState("")
  const [storyText, setStoryText] = useState("")

  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  useEffect(() => {
    fetchStories()
  }, [])

  async function fetchStories() {
    const { data, error } = await supabase
      .from("stories")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error(
        "ERRO SUPABASE:",
        JSON.stringify(error, null, 2)
      )
      return
    }

    const formattedStories = data.map((story) => ({
      id: story.id,
      title: story.title,
      text: story.text,
      authorName: story.author_name,
      placeName: story.place_name,
      memoryDate: story.memory_date,
      category: story.category,
      audioUrl: story.audio_url,
      imageUrl: story.image_url,
      location: [
        story.latitude,
        story.longitude
      ]
    }))

    setStories(formattedStories)
  }

  async function startRecording() {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        })

      audioChunksRef.current = []

      const mediaRecorder =
        new MediaRecorder(stream)

      mediaRecorderRef.current = mediaRecorder

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(
          audioChunksRef.current,
          {
            type: "audio/webm"
          }
        )

        const url =
          URL.createObjectURL(blob)

        setAudioBlob(blob)
        setAudioUrl(url)

        stream
          .getTracks()
          .forEach((track) => {
            track.stop()
          })
      }

      mediaRecorder.start()

      setIsRecording(true)
    } catch (error) {
      console.error(
        "Erro ao acessar o microfone:",
        error
      )

      alert(
        "Não foi possível acessar o microfone. Verifique a permissão do navegador."
      )
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  function deleteRecording() {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    setAudioBlob(null)
    setAudioUrl(null)
  }

  function handleImageChange(event) {
    const file = event.target.files[0]

    if (!file) {
      return
    }

    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem.")
      return
    }

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setImageFile(file)

    const previewUrl =
      URL.createObjectURL(file)

    setImagePreviewUrl(previewUrl)
  }

  function handleMapClick(location) {
    setSelectedLocation([
      location.lat,
      location.lng
    ])

    setShowForm(true)
  }

  function handleOpenForm() {
    setShowForm(true)
  }

  function handleCancel() {
    setShowForm(false)
    setSelectedLocation(null)

    setAuthorName("")
    setPlaceName("")
    setMemoryDate("")
    setCategory("")
    setTitle("")
    setStoryText("")

    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }

    setAudioBlob(null)
    setAudioUrl(null)

    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl)
    }

    setImageFile(null)
    setImagePreviewUrl(null)
  }

  async function handleSaveStory() {
    if (!authorName.trim()) {
      alert(
        "Informe o nome de quem está contando a história."
      )
      return
    }

    if (
      !title.trim() ||
      !storyText.trim()
    ) {
      alert(
        "Preencha o título e a história."
      )
      return
    }

    if (!selectedLocation) {
      alert(
        "Escolha um local no mapa antes de salvar."
      )
      return
    }

    let uploadedAudioUrl = null
    let uploadedImageUrl = null

    // =========================
    // UPLOAD DO ÁUDIO
    // =========================

    if (audioBlob) {
      const fileName =
        `${Date.now()}.webm`

      const filePath =
        `stories/${fileName}`

      console.log(
        "Tentando enviar áudio:",
        {
          fileName,
          filePath,
          size: audioBlob.size,
          type: audioBlob.type
        }
      )

      const {
        error: uploadError
      } = await supabase.storage
        .from("audio")
        .upload(
          filePath,
          audioBlob,
          {
            contentType: "audio/webm"
          }
        )

      if (uploadError) {
        console.error(
          "ERRO AO ENVIAR ÁUDIO:",
          JSON.stringify(
            uploadError,
            null,
            2
          )
        )

        alert(
          "Não foi possível enviar o áudio."
        )

        return
      }

      console.log(
        "ÁUDIO ENVIADO COM SUCESSO!"
      )

      const {
        data: publicUrlData
      } = supabase.storage
        .from("audio")
        .getPublicUrl(filePath)

      uploadedAudioUrl =
        publicUrlData.publicUrl

      console.log(
        "URL DO ÁUDIO:",
        uploadedAudioUrl
      )
    }

    // =========================
    // UPLOAD DA IMAGEM
    // =========================

    if (imageFile) {
      const fileExtension =
        imageFile.name
          .split(".")
          .pop()

      const fileName =
        `${Date.now()}.${fileExtension}`

      const filePath =
        `stories/${fileName}`

      console.log(
        "Tentando enviar imagem:",
        {
          fileName,
          filePath,
          size: imageFile.size,
          type: imageFile.type
        }
      )

      const {
        error: uploadImageError
      } = await supabase.storage
        .from("images")
        .upload(
          filePath,
          imageFile,
          {
            contentType:
              imageFile.type
          }
        )

      if (uploadImageError) {
        console.error(
          "ERRO AO ENVIAR IMAGEM:",
          JSON.stringify(
            uploadImageError,
            null,
            2
          )
        )

        alert(
          "Não foi possível enviar a imagem."
        )

        return
      }

      console.log(
        "IMAGEM ENVIADA COM SUCESSO!"
      )

      const {
        data: publicImageUrlData
      } = supabase.storage
        .from("images")
        .getPublicUrl(filePath)

      uploadedImageUrl =
        publicImageUrlData.publicUrl

      console.log(
        "URL DA IMAGEM:",
        uploadedImageUrl
      )
    }

    // =========================
    // SALVAR HISTÓRIA NO BANCO
    // =========================

    const {
      data,
      error
    } = await supabase
      .from("stories")
      .insert([
        {
          author_name:
            authorName,

          place_name:
            placeName || null,

          memory_date:
            memoryDate || null,

          category:
            category || null,

          title:
            title,

          text:
            storyText,

          latitude:
            selectedLocation[0],

          longitude:
            selectedLocation[1],

          audio_url:
            uploadedAudioUrl,

          image_url:
            uploadedImageUrl
        }
      ])
      .select()

    if (error) {
      console.error(
        "ERRO SUPABASE AO SALVAR:",
        JSON.stringify(
          error,
          null,
          2
        )
      )

      alert(
        "Não foi possível salvar a história."
      )

      return
    }

    // =========================
    // ADICIONAR À LISTA LOCAL
    // =========================

    const newStory = {
      id: data[0].id,
      title: data[0].title,
      text: data[0].text,
      authorName:
        data[0].author_name,
      placeName:
        data[0].place_name,
      memoryDate:
        data[0].memory_date,
      category:
        data[0].category,
      audioUrl:
        data[0].audio_url,
      imageUrl:
        data[0].image_url,
      location: [
        data[0].latitude,
        data[0].longitude
      ]
    }

    setStories(
      (currentStories) => [
        newStory,
        ...currentStories
      ]
    )

    handleCancel()

    alert(
      "História salva com sucesso!"
    )
  }

  return (
    <div>
      <header>
        <h1>Mapa de Memórias</h1>

        <p>
          Histórias que vivem nos lugares.
        </p>
      </header>

      <main>
        <h2>
          Explore as memórias
        </h2>

        {showForm && (
          <section>
            <h2>
              Contar uma história
            </h2>

            {selectedLocation ? (
              <p>
                📍 Localização escolhida:{" "}
                {selectedLocation[0].toFixed(5)}
                ,{" "}
                {selectedLocation[1].toFixed(5)}
              </p>
            ) : (
              <p>
                📍 Clique no mapa para escolher
                onde a memória aconteceu.
              </p>
            )}

            {/* =========================
                AUTOR
            ========================= */}

            <div>
              <label>
                Quem está contando?
              </label>

              <br />

              <input
                type="text"
                value={authorName}
                onChange={(event) =>
                  setAuthorName(
                    event.target.value
                  )
                }
                placeholder="Ex.: Maria da Silva"
              />
            </div>

            <br />

            {/* =========================
                DATA
            ========================= */}

            <div>
              <label>
                Onde aconteceu?
              </label>

              <br />

              <input
                type="text"
                value={placeName}
                onChange={(event) =>
                  setPlaceName(event.target.value)
                }
                placeholder="Ex.: Comunidade de Comboeiro"
              />
            </div>

            <br />

            <div>
              <label>
                Quando aconteceu?
              </label>

              <br />

              <input
                type="date"
                value={memoryDate}
                onChange={(event) =>
                  setMemoryDate(
                    event.target.value
                  )
                }
              />
            </div>

            <br />

            {/* =========================
                CATEGORIA
            ========================= */}

            <div>
              <label>
                Categoria
              </label>

              <br />

              <select
                value={category}
                onChange={(event) =>
                  setCategory(
                    event.target.value
                  )
                }
              >
                <option value="">
                  Selecione uma categoria
                </option>

                <option value="pessoa">
                  Pessoa
                </option>

                <option value="lugar">
                  Lugar
                </option>

                <option value="acontecimento">
                  Acontecimento
                </option>

                <option value="cotidiano">
                  Cotidiano
                </option>

                <option value="trabalho">
                  Trabalho
                </option>

                <option value="familia">
                  Família
                </option>

                <option value="outro">
                  Outro
                </option>
              </select>
            </div>

            <br />

            {/* =========================
                TÍTULO
            ========================= */}

            <div>
              <label>
                Título
              </label>

              <br />

              <input
                type="text"
                value={title}
                onChange={(event) =>
                  setTitle(
                    event.target.value
                  )
                }
                placeholder="Ex.: A enchente de 1974"
              />
            </div>

            <br />

            {/* =========================
                HISTÓRIA
            ========================= */}

            <div>
              <label>
                História
              </label>

              <br />

              <textarea
                rows="8"
                value={storyText}
                onChange={(event) =>
                  setStoryText(
                    event.target.value
                  )
                }
                placeholder="Conte a história..."
              />
            </div>

            <br />

            {/* =========================
                IMAGEM
            ========================= */}

            <div>
              <label>
                Fotografia ou imagem da memória
              </label>

              <br />
              <br />

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleImageChange
                }
              />

              {imagePreviewUrl && (
                <div
                  style={{
                    marginTop: "10px"
                  }}
                >
                  <p>
                    Pré-visualização:
                  </p>

                  <img
                    src={
                      imagePreviewUrl
                    }
                    alt="Pré-visualização da memória"
                    style={{
                      maxWidth:
                        "300px",
                      maxHeight:
                        "200px",
                      objectFit:
                        "cover",
                      borderRadius:
                        "6px"
                    }}
                  />
                </div>
              )}
            </div>

            <br />

            {/* =========================
                ÁUDIO
            ========================= */}

            <div>
              <label>
                Relato oral
              </label>

              <br />
              <br />

              {!isRecording &&
                !audioUrl && (
                  <button
                    type="button"
                    onClick={
                      startRecording
                    }
                  >
                    🎙️ Gravar relato
                  </button>
                )}

              {isRecording && (
                <div>
                  <p>
                    🔴 Gravando...
                  </p>

                  <button
                    type="button"
                    onClick={
                      stopRecording
                    }
                  >
                    ⏹️ Parar gravação
                  </button>
                </div>
              )}

              {audioUrl &&
                !isRecording && (
                  <div>
                    <p>
                      ✅ Gravação realizada.
                    </p>

                    <audio
                      controls
                      src={audioUrl}
                    />

                    <br />
                    <br />

                    <button
                      type="button"
                      onClick={
                        deleteRecording
                      }
                    >
                      🗑️ Apagar gravação
                    </button>
                  </div>
                )}
            </div>

            <br />

            {/* =========================
                BOTÕES
            ========================= */}

            <button
              type="button"
              onClick={
                handleCancel
              }
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={
                handleSaveStory
              }
            >
              Salvar história
            </button>
          </section>
        )}

        {/* =========================
            MAPA
        ========================= */}

        <Map
          stories={stories}
          onMapClick={
            handleMapClick
          }
        />

        <button
          type="button"
          onClick={
            handleOpenForm
          }
        >
          + Contar uma história
        </button>
      </main>
    </div>
  )
}

export default App
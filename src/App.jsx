import { useEffect, useRef, useState } from "react"
import Map from "./components/Map"
import { supabase } from "./lib/supabaseClient"

function App() {
  // =========================
  // ESTADOS
  // =========================

  const [stories, setStories] = useState([])
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const [authorName, setAuthorName] = useState("")
  const [memoryDate, setMemoryDate] = useState("")
  const [placeName, setPlaceName] = useState("")
  const [title, setTitle] = useState("")
  const [storyText, setStoryText] = useState("")

  // VÁRIAS TAGS
  const [categories, setCategories] = useState([])

  const [isRecording, setIsRecording] = useState(false)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl] = useState(null)

  const [imageFile, setImageFile] = useState(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])

  // =========================
  // OPÇÕES DE TAGS
  // =========================

  const categoryOptions = [
    "Família",
    "Infância",
    "Lugar",
    "Trabalho",
    "Educação",
    "Festa",
    "Conflito",
    "Cotidiano",
    "História local"
  ]

  // =========================
  // CARREGAR HISTÓRIAS
  // =========================

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

      // NOVO SISTEMA DE TAGS
      // Se uma memória antiga ainda tiver "category",
      // ela também será transformada em uma tag.
      categories:
        story.categories ||
        (story.category
          ? [story.category]
          : []),

      audioUrl: story.audio_url,
      imageUrl: story.image_url,

      location: [
        story.latitude,
        story.longitude
      ]
    }))

    setStories(formattedStories)
  }

  // =========================
  // SELECIONAR / DESELECIONAR TAG
  // =========================

  function toggleCategory(category) {
    setCategories((currentCategories) => {
      if (currentCategories.includes(category)) {
        return currentCategories.filter(
          (item) => item !== category
        )
      }

      return [
        ...currentCategories,
        category
      ]
    })
  }

  // =========================
  // GRAVAÇÃO DE ÁUDIO
  // =========================

  async function startRecording() {
    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true
        })

      audioChunksRef.current = []

      const mediaRecorder =
        new MediaRecorder(stream)

      mediaRecorderRef.current =
        mediaRecorder

      mediaRecorder.ondataavailable =
        (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(
              event.data
            )
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

  // =========================
  // IMAGEM
  // =========================

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

  // =========================
  // MAPA
  // =========================

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

  // =========================
  // CANCELAR
  // =========================

  function handleCancel() {
    setShowForm(false)
    setSelectedLocation(null)

    setAuthorName("")
    setPlaceName("")
    setMemoryDate("")
    setCategories([])
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

  // =========================
  // SALVAR HISTÓRIA
  // =========================

  async function handleSaveStory() {
    // AUTOR
    if (!authorName.trim()) {
      alert(
        "Informe o nome de quem está contando a história."
      )
      return
    }

    // TÍTULO E HISTÓRIA
    if (
      !title.trim() ||
      !storyText.trim()
    ) {
      alert(
        "Preencha o título e a história."
      )
      return
    }

    // LOCALIZAÇÃO
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
    // SALVAR NO SUPABASE
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

          // AQUI ESTÃO AS VÁRIAS TAGS
          categories:
            categories.length > 0 ? categories : [],

          // Mantém compatibilidade com o campo antigo `category`.
          // A primeira tag é gravada nele, enquanto todas as tags
          // continuam sendo gravadas no campo `categories`.
          category:
            categories.length > 0 ? categories[0] : null,

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

      categories:
        data[0].categories || [],

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

  // =========================
  // BUSCA
  // =========================

  const filteredStories =
    stories.filter((story) => {
      const search =
        searchTerm
          .toLowerCase()
          .trim()

      if (!search) {
        return true
      }

      return (
        story.title
          ?.toLowerCase()
          .includes(search) ||

        story.text
          ?.toLowerCase()
          .includes(search) ||

        story.authorName
          ?.toLowerCase()
          .includes(search) ||

        story.placeName
          ?.toLowerCase()
          .includes(search) ||

        story.categories?.some(
          (category) =>
            category
              .toLowerCase()
              .includes(search)
        )
      )
    })

  // =========================
  // INTERFACE
  // =========================

  return (
    <div>
      <header>
        <h1>mapeando memórias</h1>

        <p>
          histórias que vivem nos lugares.
        </p>
      </header>

      <main>
        <h2>
          explore as memórias:
        </h2>

        {/* =========================
            BUSCA
        ========================= */}

        <div className="search-container">
          <input
            type="search"
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(
                event.target.value
              )
            }
            placeholder="🔎 Buscar memórias..."
            aria-label="Buscar memórias"
          />

          {searchTerm && (
            <button
              type="button"
              onClick={() =>
                setSearchTerm("")
              }
              className="clear-search"
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
        </div>

        {/* =========================
            FORMULÁRIO
        ========================= */}

        {showForm ? (
          <div className="memory-creation-layout">

            {/* =========================
                MAPA
            ========================= */}

            <div className="memory-map-panel">
              <div className="memory-panel-header">
                <h2>
                  Escolha o local
                </h2>

                <p>
                  Clique no mapa para escolher
                  o lugar da memória. Depois,
                  você pode arrastar o marcador
                  para ajustar a posição.
                </p>
              </div>

              <Map
                stories={filteredStories}
                onMapClick={handleMapClick}
                selectedLocation={
                  selectedLocation
                }
              />
            </div>

            {/* =========================
                FORMULÁRIO
            ========================= */}

            <section className="memory-form-panel">

              <div className="memory-panel-header">
                <h2>
                  Contar uma história
                </h2>

                {selectedLocation ? (
                  <p>
                    📍 Localização escolhida:{" "}
                    {selectedLocation[0].toFixed(5)}
                    {" "}
                    ,
                    {" "}
                    {selectedLocation[1].toFixed(5)}
                  </p>
                ) : (
                  <p>
                    📍 Clique no mapa para escolher
                    onde a memória aconteceu.
                  </p>
                )}
              </div>

              {/* =========================
                  AUTOR
              ========================= */}

              <div className="form-group">
                <label>
                  Quem está contando?
                </label>

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

              {/* =========================
                  LUGAR
              ========================= */}

              <div className="form-group">
                <label>
                  Onde aconteceu?
                </label>

                <input
                  type="text"
                  value={placeName}
                  onChange={(event) =>
                    setPlaceName(
                      event.target.value
                    )
                  }
                  placeholder="Ex.: Comunidade de Comboeiro"
                />
              </div>

              {/* =========================
                  DATA
              ========================= */}

              <div className="form-group">
                <label>
                  Quando aconteceu?
                </label>

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

              {/* =========================
                  TAGS
              ========================= */}

              <div className="form-group">
                <label>
                  Tags da memória
                </label>

                <p className="form-help">
                  Selecione uma ou mais categorias.
                </p>

                <div className="category-tags">
                  {categoryOptions.map(
                    (category) => {
                      const selected =
                        categories.includes(
                          category
                        )

                      return (
                        <button
                          key={category}
                          type="button"
                          className={
                            selected
                              ? "category-tag selected"
                              : "category-tag"
                          }
                          onClick={() =>
                            toggleCategory(
                              category
                            )
                          }
                        >
                          {selected
                            ? "✓ "
                            : ""}
                          {category}
                        </button>
                      )
                    }
                  )}
                </div>

                {categories.length > 0 && (
                  <p className="selected-tags-text">
                    Selecionadas:{" "}
                    {categories.join(" · ")}
                  </p>
                )}
              </div>

              {/* =========================
                  TÍTULO
              ========================= */}

              <div className="form-group">
                <label>
                  Título
                </label>

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

              {/* =========================
                  HISTÓRIA
              ========================= */}

              <div className="form-group">
                <label>
                  História
                </label>

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

              {/* =========================
                  IMAGEM
              ========================= */}

              <div className="form-group">
                <label>
                  Fotografia ou imagem da memória
                </label>

                <input
                  type="file"
                  accept="image/*"
                  onChange={
                    handleImageChange
                  }
                />

                {imagePreviewUrl && (
                  <div className="image-preview">
                    <p>
                      Pré-visualização:
                    </p>

                    <img
                      src={
                        imagePreviewUrl
                      }
                      alt="Pré-visualização da memória"
                    />
                  </div>
                )}
              </div>

              {/* =========================
                  ÁUDIO
              ========================= */}

              <div className="form-group">
                <label>
                  Relato oral
                </label>

                {!isRecording &&
                  !audioUrl && (
                    <button
                      type="button"
                      onClick={
                        startRecording
                      }
                      className="audio-button"
                    >
                      🎙️ Gravar relato
                    </button>
                  )}

                {isRecording && (
                  <div className="recording-area">
                    <p>
                      🔴 Gravando...
                    </p>

                    <button
                      type="button"
                      onClick={
                        stopRecording
                      }
                      className="audio-button"
                    >
                      ⏹️ Parar gravação
                    </button>
                  </div>
                )}

                {audioUrl &&
                  !isRecording && (
                    <div className="audio-preview">
                      <p>
                        ✅ Gravação realizada.
                      </p>

                      <audio
                        controls
                        src={audioUrl}
                      />

                      <button
                        type="button"
                        onClick={
                          deleteRecording
                        }
                        className="delete-audio-button"
                      >
                        🗑️ Apagar gravação
                      </button>
                    </div>
                  )}
              </div>

              {/* =========================
                  BOTÕES
              ========================= */}

              <div className="form-actions">
                <button
                  type="button"
                  onClick={
                    handleCancel
                  }
                  className="cancel-button"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={
                    handleSaveStory
                  }
                  className="save-button"
                >
                  Salvar história
                </button>
              </div>

            </section>
          </div>
        ) : (
          <>
            {/* =========================
                MAPA NORMAL
            ========================= */}

            <Map
              stories={filteredStories}
              onMapClick={handleMapClick}
              selectedLocation={
                selectedLocation
              }
            />

            <button
              type="button"
              onClick={
                handleOpenForm
              }
              className="new-story-button"
            >
              + Contar uma história
            </button>
          </>
        )}
      </main>
    </div>
  )
}

export default App
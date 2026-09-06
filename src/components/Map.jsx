import { useState } from "react"

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMapEvents
} from "react-leaflet"

import "leaflet/dist/leaflet.css"


function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click(event) {
      onMapClick(event.latlng)
    }
  })

  return null
}


function Map({ stories, onMapClick }) {
  const [fullscreenImage, setFullscreenImage] = useState(null)

  return (
    <>
      <MapContainer
        center={[-5.795, -35.21]}
        zoom={13}
        style={{
          height: "500px",
          width: "100%"
        }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler
          onMapClick={onMapClick}
        />


        {stories.map((story) => (

          <Marker
            key={story.id}
            position={story.location}
          >

            <Popup
              maxWidth={300}
              minWidth={250}
            >

              <div
                style={{
                  width: "260px",
                  maxHeight: "400px",
                  overflowY: "auto",
                  paddingRight: "6px"
                }}
              >

                {/* IMAGEM */}

                {story.imageUrl && (

                  <div
                    style={{
                      marginBottom: "12px"
                    }}
                  >

                    <img
                      src={story.imageUrl}
                      alt={story.title}
                      onClick={() =>
                        setFullscreenImage(
                          story.imageUrl
                        )
                      }
                      style={{
                        width: "100%",
                        height: "150px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        display: "block",
                        cursor: "zoom-in"
                      }}
                    />

                  </div>

                )}


                {/* TÍTULO */}

                <h3>
                  {story.title}
                </h3>


                {/* AUTOR */}

                <p>
                  <strong>
                    Quem contou:
                  </strong>{" "}
                  {story.authorName ||
                    "Não informado"}
                </p>


                {/* LUGAR */}

                <p>
                  <strong>
                    Onde:
                  </strong>{" "}
                  {story.placeName ||
                    "Não informado"}
                </p>


                {/* DATA */}

                <p>
                  <strong>
                    Quando:
                  </strong>{" "}

                  {story.memoryDate
                    ? new Date(
                        story.memoryDate +
                          "T00:00:00"
                      ).toLocaleDateString(
                        "pt-BR"
                      )
                    : "Não informado"}
                </p>


                {/* CATEGORIA */}

                <p>
                  <strong>
                    Categoria:
                  </strong>{" "}

                  {story.category ||
                    "Não informada"}
                </p>


                <hr />


                {/* TEXTO COMPLETO */}

                <p
                  style={{
                    fontSize: "13px",
                    lineHeight: "1.5",
                    color: "#475569"
                  }}
                >
                  {story.text}
                </p>


                {/* ÁUDIO */}

                {story.audioUrl && (

                  <div>

                    <hr />

                    <p>
                      <strong>
                        🎙️ Relato oral
                      </strong>
                    </p>

                    <audio
                      controls
                      src={story.audioUrl}
                      style={{
                        width: "100%"
                      }}
                    >
                      Seu navegador não suporta áudio.
                    </audio>

                  </div>

                )}

              </div>

            </Popup>

          </Marker>

        ))}

      </MapContainer>


      {/* =================================
          IMAGEM EM TELA CHEIA
          ================================= */}

      {fullscreenImage && (

        <div
          onClick={() =>
            setFullscreenImage(null)
          }
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,

            background:
              "rgba(0, 0, 0, 0.88)",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            padding: "30px",

            cursor: "zoom-out"
          }}
        >

          {/* BOTÃO FECHAR */}

          <button
            onClick={(event) => {
              event.stopPropagation()

              setFullscreenImage(null)
            }}
            style={{
              position: "absolute",

              top: "20px",
              right: "25px",

              width: "45px",
              height: "45px",

              border: "none",
              borderRadius: "50%",

              background:
                "rgba(255, 255, 255, 0.15)",

              color: "white",

              fontSize: "28px",

              cursor: "pointer",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              lineHeight: 1
            }}
          >
            ×
          </button>


          {/* IMAGEM AMPLIADA */}

          <img
            src={fullscreenImage}
            alt="Imagem ampliada da memória"
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              maxWidth: "95vw",
              maxHeight: "90vh",

              width: "auto",
              height: "auto",

              objectFit: "contain",

              borderRadius: "8px",

              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.5)"
            }}
          />

        </div>

      )}

    </>
  )
}


export default Map
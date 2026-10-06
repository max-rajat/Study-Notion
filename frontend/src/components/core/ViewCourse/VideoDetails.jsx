import React, { useEffect, useRef, useState } from "react"
import { useDispatch, useSelector } from "react-redux"
import { useNavigate, useParams } from "react-router-dom"

import "video-react/dist/video-react.css"
import { useLocation } from "react-router-dom"
import { BigPlayButton, Player } from "video-react"

import { markLectureAsComplete } from "../../../services/operations/courseDetailsAPI"
import { updateCompletedLectures } from "../../../slices/viewCourseSlice"
import IconBtn from "../../common/IconBtn"

const VideoDetails = () => {
  const { courseId, sectionId, subSectionId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const playerRef = useRef(null)
  const dispatch = useDispatch()
  const { token } = useSelector((state) => state.auth)
  const { courseSectionData, courseEntireData, completedLectures } =
    useSelector((state) => state.viewCourse)

  const [videoData, setVideoData] = useState([])
  const [previewSource, setPreviewSource] = useState("")
  const [videoEnded, setVideoEnded] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ;(async () => {
      if (!courseSectionData.length) return
      if (!courseId && !sectionId && !subSectionId) {
        navigate(`/dashboard/enrolled-courses`)
      } else {
        // console.log("courseSectionData", courseSectionData)
        const filteredData = courseSectionData.filter(
          (course) => course._id === sectionId
        )
        // console.log("filteredData", filteredData)
        const filteredVideoData = filteredData?.[0]?.subSection.filter(
          (data) => data._id === subSectionId
        )
        // console.log("filteredVideoData", filteredVideoData)
        setVideoData(filteredVideoData[0])
        setPreviewSource(courseEntireData.thumbnail)
        setVideoEnded(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseSectionData, courseEntireData, location.pathname])

  // Resolve the current position in the course, or null when the URL points at
  // a section/subsection that isn't part of the loaded data.
  const getCurrentPosition = () => {
    const sectionIndx = courseSectionData.findIndex(
      (data) => data._id === sectionId
    )
    if (sectionIndx === -1) return null

    const subSections = courseSectionData[sectionIndx].subSection || []
    const subSectionIndx = subSections.findIndex(
      (data) => data._id === subSectionId
    )
    if (subSectionIndx === -1) return null

    return { sectionIndx, subSectionIndx, subSections }
  }

  // check if the lecture is the first video of the course
  const isFirstVideo = () => {
    const position = getCurrentPosition()
    if (!position) return true
    return position.sectionIndx === 0 && position.subSectionIndx === 0
  }

  // go to the next video
  const goToNextVideo = () => {
    const position = getCurrentPosition()
    if (!position) return

    const { sectionIndx, subSectionIndx, subSections } = position

    if (subSectionIndx !== subSections.length - 1) {
      const nextSubSectionId = subSections[subSectionIndx + 1]._id
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${nextSubSectionId}`
      )
      return
    }

    // Move into the next section, skipping any that have no lectures.
    const nextSection = courseSectionData
      .slice(sectionIndx + 1)
      .find((sec) => sec.subSection?.length > 0)
    if (!nextSection) return

    navigate(
      `/view-course/${courseId}/section/${nextSection._id}/sub-section/${nextSection.subSection[0]._id}`
    )
  }

  // check if the lecture is the last video of the course
  const isLastVideo = () => {
    const position = getCurrentPosition()
    if (!position) return true
    return (
      position.sectionIndx === courseSectionData.length - 1 &&
      position.subSectionIndx === position.subSections.length - 1
    )
  }

  // go to the previous video
  const goToPrevVideo = () => {
    const position = getCurrentPosition()
    if (!position) return

    const { sectionIndx, subSectionIndx, subSections } = position

    if (subSectionIndx !== 0) {
      const prevSubSectionId = subSections[subSectionIndx - 1]._id
      navigate(
        `/view-course/${courseId}/section/${sectionId}/sub-section/${prevSubSectionId}`
      )
      return
    }

    // Step back to the previous section that actually has lectures.
    const prevSection = courseSectionData
      .slice(0, sectionIndx)
      .reverse()
      .find((sec) => sec.subSection?.length > 0)
    if (!prevSection) return

    const prevSubSections = prevSection.subSection
    navigate(
      `/view-course/${courseId}/section/${prevSection._id}/sub-section/${prevSubSections[prevSubSections.length - 1]._id}`
    )
  }

  const handleLectureCompletion = async () => {
    setLoading(true)
    const res = await markLectureAsComplete(
      { courseId: courseId, subsectionId: subSectionId },
      token
    )
    if (res) {
      dispatch(updateCompletedLectures(subSectionId))
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col gap-5 text-white">
      {!videoData ? (
        <img
          src={previewSource}
          alt="Preview"
          className="h-full w-full rounded-md object-cover"
        />
      ) : (
        <Player
          ref={playerRef}
          aspectRatio="16:9"
          playsInline
          onEnded={() => setVideoEnded(true)}
          src={videoData?.videoUrl}
        >
          <BigPlayButton position="center" />
          {/* Render When Video Ends */}
          {videoEnded && (
            <div
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgb(0, 0, 0), rgba(0,0,0,0.7), rgba(0,0,0,0.5), rgba(0,0,0,0.1)",
              }}
              className="full absolute inset-0 z-[100] grid h-full place-content-center font-inter"
            >
              {!completedLectures.includes(subSectionId) && (
                <IconBtn
                  disabled={loading}
                  onclick={() => handleLectureCompletion()}
                  text={!loading ? "Mark As Completed" : "Loading..."}
                  customClasses="text-xl max-w-max px-4 mx-auto"
                />
              )}
              <IconBtn
                disabled={loading}
                onclick={() => {
                  if (playerRef?.current) {
                    // set the current time of the video to 0
                    playerRef?.current?.seek(0)
                    setVideoEnded(false)
                  }
                }}
                text="Rewatch"
                customClasses="text-xl max-w-max px-4 mx-auto mt-2"
              />
              <div className="mt-10 flex min-w-[250px] justify-center gap-x-4 text-xl">
                {!isFirstVideo() && (
                  <button
                    disabled={loading}
                    onClick={goToPrevVideo}
                    className="blackButton"
                  >
                    Prev
                  </button>
                )}
                {!isLastVideo() && (
                  <button
                    disabled={loading}
                    onClick={goToNextVideo}
                    className="blackButton"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          )}
        </Player>
      )}

      <h1 className="mt-4 text-3xl font-semibold">{videoData?.title}</h1>
      <p className="pt-2 pb-6">{videoData?.description}</p>
    </div>
  )
}

export default VideoDetails
// video
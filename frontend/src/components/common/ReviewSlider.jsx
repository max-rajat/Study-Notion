import React, { useEffect, useState } from "react"
import ReactStars from "react-rating-stars-component"
// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react"

// Import Swiper styles
import "swiper/css"
import "swiper/css/free-mode"
import "swiper/css/pagination"
import "../../App.css"
// Icons
import { FaStar } from "react-icons/fa"
// Import required modules
import { Autoplay, FreeMode, Pagination } from "swiper"

// Get apiFunction and the endpoint
import { apiConnector } from "../../services/apiconnector"
import { ratingsEndpoints } from "../../services/apis"

// How many cards the carousel needs before looping/auto-sizing makes sense.
// Below this, Swiper's slide-sizing math breaks down (too few real slides to
// fill slidesPerView), so we lay the cards out as plain flex boxes instead.
const CAROUSEL_THRESHOLD = 4

function ReviewCard({ review, truncateWords }) {
  return (
    <div className="flex h-full w-[300px] max-w-full flex-shrink-0 flex-col gap-3 bg-richblack-800 p-3 text-[14px] text-richblack-25">
      <div className="flex items-center gap-4">
        <img
          src={
            review?.user?.image
              ? review?.user?.image
              : `https://api.dicebear.com/5.x/initials/svg?seed=${review?.user?.firstName} ${review?.user?.lastName}`
          }
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="flex flex-col">
          <h1 className="font-semibold text-richblack-5">{`${review?.user?.firstName} ${review?.user?.lastName}`}</h1>
          <h2 className="text-[12px] font-medium text-richblack-500">
            {review?.course?.courseName}
          </h2>
        </div>
      </div>
      <p className="font-medium text-richblack-25">
        {review?.review.split(" ").length > truncateWords
          ? `${review?.review.split(" ").slice(0, truncateWords).join(" ")} ...`
          : `${review?.review}`}
      </p>
      <div className="flex items-center gap-2 ">
        <h3 className="font-semibold text-yellow-100">
          {review.rating.toFixed(1)}
        </h3>
        <ReactStars
          count={5}
          value={review.rating}
          size={20}
          edit={false}
          activeColor="#ffd700"
          emptyIcon={<FaStar />}
          fullIcon={<FaStar />}
        />
      </div>
    </div>
  )
}

function ReviewSlider() {
  const [reviews, setReviews] = useState([])
  const truncateWords = 15

  useEffect(() => {
    ;(async () => {
      const { data } = await apiConnector(
        "GET",
        ratingsEndpoints.REVIEWS_DETAILS_API
      )
      if (data?.success) {
        setReviews(data?.data)
      }
    })()
  }, [])

  // console.log(reviews)

  return (
    <div className="text-white">
      <div className="my-[50px] max-w-maxContentTab lg:max-w-maxContent">
        {reviews.length > CAROUSEL_THRESHOLD ? (
          <Swiper
            slidesPerView={4}
            spaceBetween={25}
            loop={true}
            freeMode={true}
            autoplay={{
              delay: 2500,
              disableOnInteraction: false,
            }}
            modules={[FreeMode, Pagination, Autoplay]}
            className="w-full "
          >
            {reviews.map((review, i) => (
              <SwiperSlide key={i}>
                <ReviewCard review={review} truncateWords={truncateWords} />
              </SwiperSlide>
            ))}
          </Swiper>
        ) : (
          <div className="flex flex-wrap items-stretch justify-center gap-[25px]">
            {reviews.map((review, i) => (
              <ReviewCard key={i} review={review} truncateWords={truncateWords} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReviewSlider

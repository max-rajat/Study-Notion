export default function GetAvgRating(ratingArr) {
    // --- Original tested `ratingArr?.length === 0`, which is false when
    //     ratingArr is undefined, so it fell through and returned NaN. ---
    if (!Array.isArray(ratingArr) || ratingArr.length === 0) return 0

    const totalReviewCount = ratingArr.reduce(
      (acc, curr) => acc + (Number(curr?.rating) || 0),
      0
    )

    const multiplier = Math.pow(10, 1)
    const avgReviewCount =
      Math.round((totalReviewCount / ratingArr.length) * multiplier) / multiplier

    return avgReviewCount
  }

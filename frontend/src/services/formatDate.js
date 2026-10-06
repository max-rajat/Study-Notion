export const formatDate = (dateString) => {
    const options = { year: "numeric", month: "long", day: "numeric" }
    const date = new Date(dateString)
    const formattedDate = date.toLocaleDateString("en-US", options)
  
    const hour = date.getHours()
    const minutes = date.getMinutes()
    const period = hour >= 12 ? "PM" : "AM"
    // --- Original used `hour % 12`, which renders midnight as "0:30 AM" and
    //     noon as "0:00 PM". In 12-hour time both are 12. ---
    const hour12 = hour % 12 === 0 ? 12 : hour % 12
    const formattedTime = `${hour12}:${minutes
      .toString()
      .padStart(2, "0")} ${period}`
  
    return `${formattedDate} | ${formattedTime}`
  }
import { useEffect, useState } from "react"

import { fetchAllCourses } from "../services/adminAPI"

export default function AdminCourses() {
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const getCourses = async () => {
      setLoading(true)
      const result = await fetchAllCourses()
      if (result) setCourses(result)
      setLoading(false)
    }
    getCourses()
  }, [])

  return (
    <div className="mx-auto w-11/12 max-w-[1100px] py-10">
      <h1 className="mb-2 text-3xl font-medium text-richblack-5">All Courses</h1>
      <p className="mb-8 text-sm text-richblack-300">
        Showing all published courses on the platform.
      </p>

      {loading ? (
        <p className="text-richblack-300">Loading...</p>
      ) : courses.length === 0 ? (
        <p className="text-richblack-300">No published courses found.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-richblack-700">
          <table className="w-full text-left text-sm text-richblack-100">
            <thead className="bg-richblack-700 text-richblack-25">
              <tr>
                <th className="px-4 py-3">Course</th>
                <th className="px-4 py-3">Instructor</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Students</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr
                  key={course._id}
                  className="border-t border-richblack-700 bg-richblack-800"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-x-3">
                      {course.thumbnail && (
                        <img
                          src={course.thumbnail}
                          alt={course.courseName}
                          className="h-10 w-16 rounded object-cover"
                        />
                      )}
                      <span className="font-medium text-richblack-5">
                        {course.courseName}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {course.instructor
                      ? `${course.instructor.firstName} ${course.instructor.lastName}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">₹ {course.price}</td>
                  <td className="px-4 py-3">
                    {course.studentsEnrolled?.length || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { useEffect, useRef, useState } from "react"
import { AiOutlineClose, AiOutlineMenu, AiOutlineShoppingCart } from "react-icons/ai"
import { BsChevronDown, BsSun, BsMoonStars } from "react-icons/bs"
import { VscSignOut } from "react-icons/vsc"
import { useDispatch, useSelector } from "react-redux"
import { Link, matchPath, useLocation, useNavigate } from "react-router-dom"

import logoLight from "../../assets/Logo/Logo-Full-Light.png"
import logoDark from "../../assets/Logo/Logo-Full-Dark.png"
import { NavbarLinks } from "../../data/navbar-links"
import useOnClickOutside from "../../hooks/useOnClickOutside"
import { apiConnector } from "../../services/apiconnector"
import { logout } from "../../services/operations/authAPI"
import { categories } from "../../services/apis"
import { ACCOUNT_TYPE } from "../../utils/constants"
import { useTheme } from "../../context/ThemeContext"
import ProfileDropdown from "../core/Auth/ProfileDropDown"

function Navbar() {
  const { token } = useSelector((state) => state.auth)
  const { user } = useSelector((state) => state.profile)
  const { totalItems } = useSelector((state) => state.cart)
  const { theme, toggleTheme } = useTheme()
  const location = useLocation()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const isLight = theme === "light"
  const isHome = location.pathname === "/"

  const [subLinks, setSubLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileCatalogOpen, setMobileCatalogOpen] = useState(false)
  const mobileMenuRef = useRef(null)

  useOnClickOutside(mobileMenuRef, () => setMobileMenuOpen(false))

  // Close the mobile menu whenever the route changes.
  useEffect(() => {
    setMobileMenuOpen(false)
    setMobileCatalogOpen(false)
  }, [location.pathname])

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      try {
        const res = await apiConnector("GET", categories.CATEGORIES_API)
        setSubLinks(res.data.data)
      } catch (error) {
        console.log("Could not fetch Categories.", error)
      }
      setLoading(false)
    })()
  }, [])

  // console.log("sub links", subLinks)

  const matchRoute = (route) => {
    return matchPath({ path: route }, location.pathname)
  }

  return (
    <div
      className={`relative flex h-14 items-center justify-center border-b-[1px] ${
        isLight ? "border-b-pure-greys-25" : "border-b-richblack-700"
      } ${
        isHome
          ? "bg-transparent"
          : isLight
          ? "bg-white shadow-sm"
          : "bg-richblack-800"
      } transition-all duration-200`}
    >
      <div className="flex w-11/12 max-w-maxContent items-center justify-between">
        {/* Logo */}
        <Link to="/">
          <img
            src={isLight ? logoDark : logoLight}
            alt="Logo"
            width={160}
            height={32}
            loading="lazy"
          />
        </Link>
        {/* Navigation links */}
        <nav className="hidden md:block">
          <ul className="flex gap-x-6 text-richblack-25">
            {NavbarLinks.map((link, index) => (
              <li key={index}>
                {link.title === "Catalog" ? (
                  <>
                    <div
                      className={`group relative flex cursor-pointer items-center gap-1 ${
                        matchRoute("/catalog/:catalogName")
                          ? "text-yellow-25"
                          : "text-richblack-25"
                      }`}
                    >
                      <p>{link.title}</p>
                      <BsChevronDown />
                      <div className="invisible absolute left-[50%] top-[50%] z-[1000] flex w-[200px] translate-x-[-50%] translate-y-[3em] flex-col rounded-lg bg-richblack-5 p-4 text-richblack-900 opacity-0 transition-all duration-150 group-hover:visible group-hover:translate-y-[1.65em] group-hover:opacity-100 lg:w-[300px]">
                        <div className="absolute left-[50%] top-0 -z-10 h-6 w-6 translate-x-[80%] translate-y-[-40%] rotate-45 select-none rounded bg-richblack-5"></div>
                        {loading ? (
                          <p className="text-center">Loading...</p>
                        ) : subLinks?.filter(
                            (subLink) => subLink?.courses?.length > 0
                          )?.length ? (
                          <>
                            {subLinks
                              ?.filter(
                                (subLink) => subLink?.courses?.length > 0
                              )
                              ?.map((subLink, i) => (
                                <Link
                                  to={`/catalog/${subLink.name
                                    .split(" ")
                                    .join("-")
                                    .toLowerCase()}`}
                                  className="rounded-lg bg-transparent py-4 pl-4 hover:bg-richblack-50"
                                  key={i}
                                >
                                  <p>{subLink.name}</p>
                                </Link>
                              ))}
                          </>
                        ) : (
                          <p className="text-center">No Courses Found</p>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <Link to={link?.path}>
                    <p
                      className={`${
                        matchRoute(link?.path)
                          ? "text-yellow-25"
                          : "text-richblack-25"
                      }`}
                    >
                      {link.title}
                    </p>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        {/* Right side actions */}
        <div className="flex items-center gap-x-4">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="grid h-9 w-9 place-items-center rounded-full text-richblack-100 transition-colors hover:bg-richblack-700"
          >
            {theme === "dark" ? (
              <BsSun className="text-lg" />
            ) : (
              <BsMoonStars className="text-lg" />
            )}
          </button>

        {/* Login / Signup / Dashboard */}
        <div className="hidden items-center gap-x-4 md:flex">
          {user && user?.accountType !== ACCOUNT_TYPE.INSTRUCTOR && (
            <Link to="/dashboard/cart" className="relative">
              <AiOutlineShoppingCart className="text-2xl text-richblack-100" />
              {totalItems > 0 && (
                <span className="absolute -bottom-2 -right-2 grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-richblack-600 text-center text-xs font-bold text-yellow-100">
                  {totalItems}
                </span>
              )}
            </Link>
          )}
          {token === null && (
            <Link to="/login">
              <button className="rounded-[8px] border border-richblack-700 bg-richblack-800 px-[12px] py-[8px] text-richblack-100">
                Log in
              </button>
            </Link>
          )}
          {token === null && (
            <Link to="/signup">
              <button className="rounded-[8px] border border-richblack-700 bg-richblack-800 px-[12px] py-[8px] text-richblack-100">
                Sign up
              </button>
            </Link>
          )}
          {token !== null && <ProfileDropdown />}
        </div>
          <button
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            className="grid h-9 w-9 place-items-center rounded-full text-richblack-100 transition-colors hover:bg-richblack-700 md:hidden"
          >
            {mobileMenuOpen ? (
              <AiOutlineClose fontSize={24} fill={isLight ? "#424854" : "#AFB2BF"} />
            ) : (
              <AiOutlineMenu fontSize={24} fill={isLight ? "#424854" : "#AFB2BF"} />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      {mobileMenuOpen && (
        <div
          ref={mobileMenuRef}
          className={`absolute left-0 top-14 z-[1100] w-full border-b-[1px] md:hidden ${
            isLight
              ? "border-b-pure-greys-25 bg-white"
              : "border-b-richblack-700 bg-richblack-800"
          }`}
        >
          <div className="mx-auto flex w-11/12 max-w-maxContent flex-col gap-y-2 py-4">
            {NavbarLinks.map((link, index) =>
              link.title === "Catalog" ? (
                <div key={index}>
                  <button
                    onClick={() => setMobileCatalogOpen((prev) => !prev)}
                    className={`flex w-full items-center justify-between py-2 ${
                      matchRoute("/catalog/:catalogName")
                        ? "text-yellow-25"
                        : "text-richblack-25"
                    }`}
                  >
                    <span>Catalog</span>
                    <BsChevronDown
                      className={`transition-transform duration-150 ${
                        mobileCatalogOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {mobileCatalogOpen && (
                    <div className="flex flex-col gap-y-1 border-l border-richblack-700 pl-4">
                      {loading ? (
                        <p className="py-2 text-richblack-300">Loading...</p>
                      ) : subLinks?.filter(
                          (subLink) => subLink?.courses?.length > 0
                        )?.length ? (
                        subLinks
                          ?.filter((subLink) => subLink?.courses?.length > 0)
                          ?.map((subLink, i) => (
                            <Link
                              to={`/catalog/${subLink.name
                                .split(" ")
                                .join("-")
                                .toLowerCase()}`}
                              className="py-2 text-richblack-300"
                              key={i}
                            >
                              {subLink.name}
                            </Link>
                          ))
                      ) : (
                        <p className="py-2 text-richblack-300">
                          No Courses Found
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Link key={index} to={link?.path} className="py-2">
                  <p
                    className={`${
                      matchRoute(link?.path)
                        ? "text-yellow-25"
                        : "text-richblack-25"
                    }`}
                  >
                    {link.title}
                  </p>
                </Link>
              )
            )}

            <div
              className={`my-2 h-[1px] w-full ${
                isLight ? "bg-pure-greys-25" : "bg-richblack-700"
              }`}
            />

            {user && user?.accountType !== ACCOUNT_TYPE.INSTRUCTOR && (
              <Link to="/dashboard/cart" className="flex items-center gap-x-2 py-2 text-richblack-25">
                <span className="relative">
                  <AiOutlineShoppingCart className="text-xl" />
                  {totalItems > 0 && (
                    <span className="absolute -bottom-2 -right-2 grid h-5 w-5 place-items-center overflow-hidden rounded-full bg-richblack-600 text-center text-xs font-bold text-yellow-100">
                      {totalItems}
                    </span>
                  )}
                </span>
                Cart
              </Link>
            )}

            {token !== null && (
              <>
                <Link to="/dashboard/my-profile" className="py-2 text-richblack-25">
                  Dashboard
                </Link>
                <button
                  onClick={() => dispatch(logout(navigate))}
                  className="flex items-center gap-x-2 py-2 text-left text-richblack-25"
                >
                  <VscSignOut className="text-lg" />
                  Logout
                </button>
              </>
            )}

            {token === null && (
              <div className="flex items-center gap-x-4 py-2">
                <Link to="/login" className="w-1/2">
                  <button className="w-full rounded-[8px] border border-richblack-700 bg-richblack-800 px-[12px] py-[8px] text-richblack-100">
                    Log in
                  </button>
                </Link>
                <Link to="/signup" className="w-1/2">
                  <button className="w-full rounded-[8px] border border-richblack-700 bg-richblack-800 px-[12px] py-[8px] text-richblack-100">
                    Sign up
                  </button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Navbar
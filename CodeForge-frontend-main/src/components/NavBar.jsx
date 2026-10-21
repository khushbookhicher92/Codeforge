import { Link, useNavigate } from "react-router-dom";
import logo from "../assets/favicon.png";
import useAuthStore from "../store/authStore";

export default function NavBar() {
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="w-full bg-[#FBE6D8] px-10 py-5 flex items-center justify-between absolute top-0 left-0 z-50">

      {/* Logo */}
      <Link to={isAuthenticated ? "/problems" : "/login"} className="flex items-center gap-3 cursor-pointer">
        <img
          src={logo}
          alt="logo"
          className="w-10 h-10"
        />

        <h1 className="text-2xl  font-bold text-[#6A0D45]">
          CodeForge
        </h1>
      </Link>

      {/* Navigation Links */}
      <div className="hidden md:flex items-center gap-10 text-lg font-medium">

        {isAuthenticated && (
          <>
            <Link
              to="/problems"
              className="text-gray-700 hover:text-[#8C1D63] transition duration-300"
            >
              Problems
            </Link>

            <Link
              to="/submissions"
              className="text-gray-700 hover:text-[#8C1D63] transition duration-300"
            >
              History
            </Link>

            <Link
              to="/profile"
              className="text-gray-700 hover:text-[#8C1D63] transition duration-300"
            >
              {user?.username || "Profile"}
            </Link>

            <button
              onClick={handleLogout}
              className="text-gray-700 hover:text-[#8C1D63] transition duration-300"
            >
              Logout
            </button>
          </>
        )}

        {!isAuthenticated && (
          <Link
            to="/login"
            className="text-gray-700 hover:text-[#8C1D63] transition duration-300"
          >
            Login
          </Link>
        )}

      </div>

    </nav>
  );
};

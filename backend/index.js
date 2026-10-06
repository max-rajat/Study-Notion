// dotenv has to run before any module that reads process.env at require time
// (config/razorpay builds its client immediately, config/database reads the URL).
const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const app = express();

const userRoutes = require("./routes/User");
const profileRoutes = require("./routes/Profile");
const paymentRoutes = require("./routes/Payments");
const courseRoutes = require("./routes/Course");
const adminRoutes = require("./AdminPanel/routes/Admin");
const contactUsRoute = require("./routes/Contact");
const database = require("./config/database");
const cookieParser = require("cookie-parser");

const {cloudinaryConnect } = require("./config/cloudinary");
const fileUpload = require("express-fileupload");
const os = require("os");

const PORT = process.env.PORT || 4000;

// Fail fast on missing configuration rather than erroring on the first request.
const REQUIRED_ENV = ["MONGODB_URL", "JWT_SECRET"];
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
	console.error(
		`Missing required environment variable(s): ${missingEnv.join(", ")}`
	);
	process.exit(1);
}

//database connect
database.connect();
//middlewares
app.use(express.json());
app.use(cookieParser());





const cors = require("cors");
const allowedOrigins = [
  "http://localhost:3000",
];
// Add production frontend URL from env if set
if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    // Allow if in the explicit list
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow any Vercel preview/deployment URL for this project
    if (origin.endsWith(".vercel.app")) return callback(null, true);
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
}));

// important for preflight
app.options("*", cors());


app.use(
	fileUpload({
		useTempFiles:true,
		// --- Original hardcoded "/tmp", which doesn't exist on Windows. ---
		tempFileDir: os.tmpdir(),
		limits: { fileSize: 100 * 1024 * 1024 },
		abortOnLimit: true,
	})
)
//cloudinary connection
cloudinaryConnect();

//routes
app.use("/api/v1/auth", userRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/course", courseRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/payment", paymentRoutes);
app.use("/api/v1/reach", contactUsRoute);

//def route

app.get("/", (req, res) => {
	return res.json({
		success:true,
		message:'Your server is up and running....'
	});
});

// Unknown routes should be a JSON 404, matching the rest of the API.
app.use((req, res) => {
	return res.status(404).json({
		success: false,
		message: `Route not found: ${req.method} ${req.originalUrl}`,
	});
});

// Catch-all error handler. Without this, a throw in any handler returned
// Express's default HTML error page (with a stack trace in development).
app.use((error, req, res, next) => {
	if (error && error.message === "Not allowed by CORS") {
		return res.status(403).json({ success: false, message: "Origin not allowed" });
	}
	console.error("Unhandled error:", error);
	if (res.headersSent) {
		return next(error);
	}
	return res.status(500).json({
		success: false,
		message: "Internal server error",
	});
});

const server = app.listen(PORT, () => {
	console.log(`App is running at ${PORT}`)
})

// Without a listener for this, a failed bind surfaces as an unhandled 'error'
// event: a bare stack trace that doesn't say what actually went wrong. The
// common case by far is a previous instance still holding the port.
server.on("error", (error) => {
	if (error.code === "EADDRINUSE") {
		console.error(
			`
Port ${PORT} is already in use — another instance is probably still running.
` +
				`Stop it, or start this one on a different port with PORT=<other> npm run dev.
` +
				`  Windows: Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
` +
				`  macOS/Linux: lsof -ti :${PORT} | xargs kill
`
		)
	} else if (error.code === "EACCES") {
		console.error(`
Not permitted to bind port ${PORT}. Try a port above 1024.
`)
	} else {
		console.error("Server failed to start:", error)
	}
	process.exit(1)
})


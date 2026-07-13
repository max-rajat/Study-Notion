import { createSlice } from "@reduxjs/toolkit";

// The admin panel keeps its OWN session, completely separate from the public
// user site. It uses dedicated localStorage keys ("adminToken" / "adminUser")
// so logging into the admin panel never affects the public site's auth, and
// vice versa.
const safeParse = (raw) => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
};

const initialState = {
  loading: false,
  adminToken: safeParse(localStorage.getItem("adminToken")),
  adminUser: safeParse(localStorage.getItem("adminUser")),
};

const adminAuthSlice = createSlice({
  name: "adminAuth",
  initialState,
  reducers: {
    setAdminLoading(state, value) {
      state.loading = value.payload;
    },
    setAdminToken(state, value) {
      state.adminToken = value.payload;
    },
    setAdminUser(state, value) {
      state.adminUser = value.payload;
    },
  },
});

export const { setAdminLoading, setAdminToken, setAdminUser } =
  adminAuthSlice.actions;

export default adminAuthSlice.reducer;

import { createSlice } from "@reduxjs/toolkit";

// Safely read the token from localStorage. It is normally stored JSON-stringified,
// but if a raw JWT ever got saved, JSON.parse would throw and crash the whole app,
// so fall back to using the raw string instead of letting the error bubble up.
const getStoredToken = () => {
  const raw = localStorage.getItem("token");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return raw;
  }
};

const initialState = {
  signupData: null,
  loading: false,
  token: getStoredToken(),
};

const authSlice = createSlice({
  name: "auth",
  initialState: initialState,
  reducers: {
    setSignupData(state, value) {
      state.signupData = value.payload;
    },
    setLoading(state, value) {
      state.loading = value.payload;
    },
    setToken(state, value) {
      state.token = value.payload;
    },
  },
});

export const { setSignupData, setLoading, setToken } = authSlice.actions;

export default authSlice.reducer;
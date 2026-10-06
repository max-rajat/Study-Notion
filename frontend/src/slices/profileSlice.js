import {createSlice} from "@reduxjs/toolkit"

// A corrupted "user" entry would make JSON.parse throw during module
// evaluation and take down the app before it rendered. (authSlice and
// adminAuthSlice already guard their reads the same way.)
const getStoredUser = () => {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        localStorage.removeItem("user");
        return null;
    }
};

const initialState = {
    user: getStoredUser(),
    loading: false,
};

const profileSlice = createSlice({
    name:"profile",
    initialState: initialState,
    reducers: {
        setUser(state, value) {
            state.user = value.payload;
        },
        setLoading(state, value) {
            state.loading = value.payload;
          },
    },
});

export const {setUser, setLoading} = profileSlice.actions;
export default profileSlice.reducer;
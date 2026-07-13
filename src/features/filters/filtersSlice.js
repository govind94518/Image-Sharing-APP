import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  studies: [],
  procedures: [],
  specialties: [],
  sites: [],
  dates: [],
  search: "",
  includeExternal: false,
  currentEncounterOnly: false,
  sortDirection: "desc",
};

const filtersSlice = createSlice({
  name: "filters",
  initialState,
  reducers: {
    setFilter(state, action) {
      const { name, value } = action.payload;
      state[name] = value;
    },
    resetFilters() {
      return initialState;
    },
  },
});

export const { resetFilters, setFilter } = filtersSlice.actions;
export default filtersSlice.reducer;

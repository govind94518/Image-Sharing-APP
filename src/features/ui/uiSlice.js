import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  modal: null,
  selectedStudy: null,
  viewerSession: null,
  notice: null,
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openStudyModal(state, action) {
      state.modal = action.payload.type;
      state.selectedStudy = action.payload.study;
      state.viewerSession = null;
    },
    closeModal(state) {
      state.modal = null;
      state.selectedStudy = null;
      state.viewerSession = null;
    },
    setViewerSession(state, action) {
      state.viewerSession = action.payload;
    },
    showNotice(state, action) {
      state.notice = action.payload;
    },
    clearNotice(state) {
      state.notice = null;
    },
  },
});

export const {
  clearNotice,
  closeModal,
  openStudyModal,
  setViewerSession,
  showNotice,
} = uiSlice.actions;
export default uiSlice.reducer;

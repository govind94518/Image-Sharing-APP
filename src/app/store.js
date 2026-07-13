import { configureStore } from "@reduxjs/toolkit";
import filtersReducer from "../features/filters/filtersSlice";
import uiReducer from "../features/ui/uiSlice";
import { imagingApi } from "../services/imagingApi";

export const store = configureStore({
  reducer: {
    filters: filtersReducer,
    ui: uiReducer,
    [imagingApi.reducerPath]: imagingApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(imagingApi.middleware),
});

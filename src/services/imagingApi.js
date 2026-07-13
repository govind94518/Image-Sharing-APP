import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { mockCdexClient } from "./mockCdexApi";

const safeQuery = (request) => async () => {
  try {
    return { data: await request() };
  } catch (error) {
    return {
      error: {
        status: "MOCK_ERROR",
        data: error instanceof Error ? error.message : "Mock request failed.",
      },
    };
  }
};

export const imagingApi = createApi({
  reducerPath: "imagingApi",
  baseQuery: fakeBaseQuery(),
  tagTypes: ["Studies"],
  endpoints: (builder) => ({
    getSession: builder.query({
      queryFn: safeQuery(() => mockCdexClient.getSession()),
    }),
    searchStudies: builder.query({
      queryFn: (filters) => safeQuery(() => mockCdexClient.searchStudies(filters))(),
      providesTags: ["Studies"],
    }),
    getReport: builder.query({
      queryFn: (reportId) => safeQuery(() => mockCdexClient.getReport(reportId))(),
    }),
    launchViewer: builder.mutation({
      queryFn: (studyId) => safeQuery(() => mockCdexClient.launchViewer(studyId))(),
    }),
  }),
});

export const {
  useGetReportQuery,
  useGetSessionQuery,
  useLaunchViewerMutation,
  useSearchStudiesQuery,
} = imagingApi;

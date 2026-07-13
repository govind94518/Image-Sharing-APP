import { Provider } from "react-redux";
import ImagingDashboard from "./components/ImagingDashboard";
import { store } from "./app/store";

export default function App() {
  return (
    <Provider store={store}>
      <ImagingDashboard />
    </Provider>
  );
}

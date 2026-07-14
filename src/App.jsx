import { Provider } from "react-redux";
import SmartLaunchGate from "./components/SmartLaunchGate";
import { store } from "./app/store";

export default function App() {
  return (
    <Provider store={store}>
      <SmartLaunchGate />
    </Provider>
  );
}

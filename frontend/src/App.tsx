import { Routes, Route } from "react-router-dom";
import Layout from "./layout/Layout";
import Overview from "./pages/Overview";
import Landing from "./pages/Landing";
import Topology from "./pages/Topology";
import Ports from "./pages/Ports";
import Traffic from "./pages/Traffic";
import Workloads from "./pages/Workloads";
import Namespaces from "./pages/Namespaces";
import Pods from "./pages/Pods";
import Nodes from "./pages/Nodes";
import Networking from "./pages/Networking";
import RBAC from "./pages/RBAC";
import Secrets from "./pages/Secrets";
import CRDs from "./pages/CRDs";
import Storage from "./pages/Storage";
import Metrics from "./pages/Metrics";
import Validation from "./pages/Validation";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="topology" element={<Topology />} />
        <Route path="ports" element={<Ports />} />
        <Route path="traffic" element={<Traffic />} />
        <Route path="workloads" element={<Workloads />} />
        <Route path="namespaces" element={<Namespaces />} />
        <Route path="pods" element={<Pods />} />
        <Route path="nodes" element={<Nodes />} />
        <Route path="networking" element={<Networking />} />
        <Route path="rbac" element={<RBAC />} />
        <Route path="secrets" element={<Secrets />} />
        <Route path="crds" element={<CRDs />} />
        <Route path="storage" element={<Storage />} />
        <Route path="metrics" element={<Metrics />} />
        <Route path="validation" element={<Validation />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

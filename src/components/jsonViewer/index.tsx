import JsonView from "@uiw/react-json-view";
import JsonViewEditor from "@uiw/react-json-view/editor";
import { lightTheme } from "@uiw/react-json-view/light";
import { darkTheme } from "@uiw/react-json-view/dark";
import { TriangleArrow } from "@uiw/react-json-view/triangle-arrow";
import { TriangleSolidArrow } from "@uiw/react-json-view/triangle-solid-arrow";

type JsonViewerProps = {
  data: any;
  className?: string;
};

const JsonViewer = ({ data, className }: JsonViewerProps) => {
  return <JsonView value={data} />;
};

export default JsonViewer;

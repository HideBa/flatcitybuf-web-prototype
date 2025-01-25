import JsonView from "@uiw/react-json-view";

type JsonViewerProps = {
  data: object;
};

const JsonViewer = ({ data }: JsonViewerProps) => {
  return <JsonView value={data} />;
};

export default JsonViewer;

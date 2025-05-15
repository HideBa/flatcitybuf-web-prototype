import JsonView from "@uiw/react-json-view";

type JsonViewerProps = {
	data: object;
	collapsed?: boolean | number;
};

const JsonViewer = ({ data, collapsed = 2 }: JsonViewerProps) => {
	return <JsonView value={data} collapsed={collapsed} />;
};

export default JsonViewer;

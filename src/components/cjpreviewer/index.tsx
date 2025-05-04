//Fix dependency later
import JsonViewer from "@/components/jsonViewer";

export type CjInfo = {
  features: unknown[];
  cj: unknown;
  stats?: {
    num_total_features: number;
    num_selected_features: number;
    median_roof_height?: number; //b3_h_dak_50p
    ratio_of_green_house_warehouse?: number; //b3_kas_warenhuis
    num_ahn3_ahn4_change?: number; //b3_mutatie_ahn3_ahn4
    unsuccess_num?: number; //b3_succes
    ave_volume_lod2?: number; //b3_volume_lod22
    ave_construction_year?: number; //oorspronkelijkbouwjaar
  };
};

type CjPreviewerProps = {
  result?: CjInfo;
};

const CjPreviewer = ({ result }: CjPreviewerProps) => {
  const { cj, features, stats } = result ?? {};
  return (
    <div className="h-full bg-background p-4">
      <h2 className="text-lg font-semibold mb-4">CityJSONSeq Overview</h2>
      <div className="grid grid-cols-3 gap-4 h-[calc(100%-3rem)]">
        {result ? (
          <>
            <div className="overflow-auto">
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                CityJSON Information
              </h3>
              <JsonViewer data={cj as object} />
            </div>
            <div className="overflow-auto">
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                CityJSONFeature
              </h3>
              <JsonViewer data={features ?? []} />
            </div>
            <div className="overflow-auto">
              {result?.stats && (
                <>
                  <h3 className="text-sm font-medium mb-2 text-muted-foreground">
                    Statistics of selected features
                  </h3>
                  <div className="rounded-lg border bg-card">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="p-3 text-left font-medium">
                            Statistic
                          </th>
                          <th className="p-3 text-left font-medium">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="p-3">Total Features</td>
                          <td className="p-3">
                            {stats?.num_total_features ?? 0}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Selected Features</td>
                          <td className="p-3">
                            {stats?.num_selected_features ?? 0}
                          </td>
                        </tr>
                        {/* <tr className="border-b">
                          <td className="p-3">Median Roof Height</td>
                          <td className="p-3">
                            {result?.stats.median_roof_height?.toFixed(2) ??
                              "N/A"}{" "}
                            m
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Green House Ratio</td>
                          <td className="p-3">
                            {(
                              result?.stats.ratio_of_green_house_warehouse ?? 0
                            ).toLocaleString(undefined, {
                              style: "percent",
                              minimumFractionDigits: 1,
                            })}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">AHN3/AHN4 Changes</td>
                          <td className="p-3">
                            {result?.stats.num_ahn3_ahn4_change ?? 0}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Unsuccessful Cases</td>
                          <td className="p-3">
                            {result?.stats.unsuccess_num ?? 0}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <td className="p-3">Average Volume (LOD2)</td>
                          <td className="p-3">
                            {result?.stats.ave_volume_lod2?.toFixed(2) ?? "N/A"}{" "}
                            m³
                          </td>
                        </tr>
                        <tr>
                          <td className="p-3">Average Construction Year</td>
                          <td className="p-3">
                            {result?.stats.ave_construction_year?.toFixed(0) ??
                              "N/A"}
                          </td>
                        </tr> */}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="text-muted-foreground text-center col-span-3">
            No data to display. Draw a rectangle and fetch FCB data to see
            results.
          </div>
        )}
      </div>
    </div>
  );
};

export default CjPreviewer;

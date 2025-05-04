import { atom } from "jotai";
import { type Condition } from "@/feature/attribute/hooks";
import * as Cesium from "cesium";

// Types
export type FetchMode = "bbox" | "attribute";

export type LastFetchedData = {
  type: "bbox" | "attribute";
  bbox?: number[];
  attributes?: Condition[];
  totalFeatures: number;
  currentOffset: number;
};

// Atoms
export const rectangleAtom = atom<Cesium.Rectangle | null>(null);
export const fetchModeAtom = atom<FetchMode>("bbox");
export const attributeConditionsAtom = atom<Condition[]>([
  { attribute: "b3_h_dak_50p", operator: "Gt", value: 20.0 },
  {
    attribute: "identificatie",
    operator: "Eq",
    value: "NL.IMBAG.Pand.0503100000012869",
  },
]);
export const featureLimitAtom = atom<number>(100);
export const isLoadingAtom = atom<boolean>(false);
export const lastFetchedDataAtom = atom<LastFetchedData | null>(null);

// Derived atoms
export const canFetchDataAtom = atom((get) => {
  const fetchMode = get(fetchModeAtom);
  const rectangle = get(rectangleAtom);
  const isLoading = get(isLoadingAtom);

  return (fetchMode === "bbox" ? !!rectangle : true) && !isLoading;
});

export const hasMoreDataAtom = atom((get) => {
  const lastFetchedData = get(lastFetchedDataAtom);
  const isLoading = get(isLoadingAtom);

  return lastFetchedData
    ? lastFetchedData.currentOffset < lastFetchedData.totalFeatures &&
        !isLoading
    : false;
});

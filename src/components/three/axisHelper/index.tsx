import React from "react";
import { Text } from "@react-three/drei";

export type AxisHelperProps = {
  label?: boolean;
};

const AxisHelper = ({ label = true }: AxisHelperProps) => {
  return (
    <>
      <axesHelper args={[5]} />
      <Text
        position={[5, 0, 0]} // Position at the end of X-axis
        fontSize={0.5} // Adjust font size
        color="red" // Color for X-axis label
        anchorX="center" // Center the text horizontally
        anchorY="middle" // Center the text vertically
      >
        X
      </Text>

      {/* Y-axis Label */}
      <Text
        position={[0, 5, 0]} // Position at the end of Y-axis
        fontSize={0.5} // Adjust font size
        color="green" // Color for Y-axis label
        anchorX="center" // Center the text horizontally
        anchorY="middle" // Center the text vertically
      >
        Y
      </Text>

      {/* Z-axis Label */}
      <Text
        position={[0, 0, 5]} // Position at the end of Z-axis
        fontSize={0.5} // Adjust font size
        color="blue" // Color for Z-axis label
        anchorX="center" // Center the text horizontally
        anchorY="middle" // Center the text vertically
      >
        Z
      </Text>
    </>
  );
};

export default AxisHelper;

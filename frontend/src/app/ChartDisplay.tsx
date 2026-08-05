// src/app/charts/ChartDisplay.tsx
import React, { useState, useEffect } from "react";
import Image from 'next/image';
// REMOVED: import fs from 'fs/promises';
// REMOVED: import path from 'path';


interface ChartDisplayProps {
  initialFiles: string[];
}

export default function ChartDisplay({ initialFiles }: ChartDisplayProps) {
  const [files, setFiles] = useState(initialFiles);
  // Your rendering and recharts logic here...
  console.log(files);
  return (

      <div className="p-4 max-w-2xl bg-white rounded-2xl shadow-md ">
            
            <ul className="space-y-2 justify-center items-center">
              {files.map((file) => (
                <li key={file} className="text-lg font-large text-gray-700 pl-4 ">                  
                  <Image
                    src={`/${file}`} // Place your file inside the /public folder
                    width={800}
                    height={800}
                    alt="User profile picture"
                    className="rounded-xl object-cover hover:scale-105 transition-transform duration-300"
                  />
                </li>
              ))}
            </ul>
    </div>
  )
}

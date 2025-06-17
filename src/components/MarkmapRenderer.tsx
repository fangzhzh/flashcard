
"use client";
import React, { useEffect, useRef, memo } from 'react';
import { Markmap } from 'markmap-view';
import { Transformer } from 'markmap-lib';

interface MarkmapRendererProps {
  markdownContent: string;
}

const MarkmapRenderer: React.FC<MarkmapRendererProps> = ({ markdownContent }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const markmapInstanceRef = useRef<Markmap | null>(null);
  const transformer = useRef(new Transformer()); // Use ref for stable transformer instance

  useEffect(() => {
    let currentMarkmapInstance: Markmap | null = null; // To track the instance for the current effect run

    if (svgRef.current) {
      // Clear previous markmap instance if it exists
      if (markmapInstanceRef.current) {
        // markmap-view doesn't have a dedicated destroy method for the instance itself,
        // but clearing the SVG content and nullifying the ref is the standard approach.
        svgRef.current.innerHTML = '';
        markmapInstanceRef.current = null;
      }

      if (markdownContent && markdownContent.trim() !== "") {
        try {
          const { root, features } = transformer.current.transform(markdownContent);
          currentMarkmapInstance = Markmap.create(svgRef.current, undefined, root);
          markmapInstanceRef.current = currentMarkmapInstance;

          // Attempt to refit after a short delay to ensure container dimensions are stable.
          // This can help if CSS-driven parent height (e.g., min-h-[60vh])
          // isn't fully computed when Markmap.create initially runs.
          const timerId = setTimeout(() => {
            // Only fit if this instance is still the current one
            if (markmapInstanceRef.current && markmapInstanceRef.current === currentMarkmapInstance) {
              markmapInstanceRef.current.fit().catch(err => console.error("Error on delayed fit:", err));
            }
          }, 50); // 50ms delay, adjust if needed

          return () => { // Cleanup function for this effect
            clearTimeout(timerId);
            // If the component unmounts or markdownContent changes triggering a new effect run,
            // and this specific instance was set, ensure its "view" (SVG content) is cleared.
            // This check helps if the component re-renders quickly.
            if (svgRef.current && markmapInstanceRef.current === currentMarkmapInstance) {
                svgRef.current.innerHTML = '';
                markmapInstanceRef.current = null;
            }
          };

        } catch (e) {
          console.error("Error rendering mindmap:", e);
          if (svgRef.current) {
            svgRef.current.innerHTML = '<text x="10" y="20" fill="currentColor" class="text-destructive">Error rendering mindmap. Check console.</text>';
          }
        }
      } else {
        // If markdownContent is empty, ensure the SVG is cleared
        svgRef.current.innerHTML = '';
        markmapInstanceRef.current = null;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markdownContent]); // Effect reruns when markdownContent changes

  // The parent div in ReviewModeClient.tsx already has min-h-[60vh] and max-h-[75vh].
  // This SVG should fill its parent, which is MarkmapRenderer's root.
  return <svg ref={svgRef} className="w-full h-full bg-background rounded-md border" />;
};

export default memo(MarkmapRenderer);

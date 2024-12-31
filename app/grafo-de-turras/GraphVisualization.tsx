'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { TurraNode } from '@/infrastructure/TweetProvider';
import { FaSearchPlus, FaSearchMinus, FaExpand, FaTimes } from 'react-icons/fa';

interface GraphNode extends TurraNode {
  x?: number;
  y?: number;
  index?: number;
}

export default function GraphVisualization({ nodes }: { nodes: GraphNode[] }) {
  const ref = useRef<SVGSVGElement>(null);
  const [legendVisible, setLegendVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const categories = Array.from(new Set(nodes.map(node => node.categories[0])));

    const links: { source: number; target: number }[] = [];
    nodes.forEach((node, index) => {
      node.related_threads.forEach(relatedId => {
        const targetIndex = nodes.findIndex(n => n.id === relatedId);
        if (targetIndex !== -1) {
          links.push({ source: index, target: targetIndex });
        }
      });
    });

    const container = ref.current.parentElement;
    const width = container?.clientWidth ?? 800;
    const height = container?.clientHeight ?? 600;

    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.index ?? 0))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6);

    const node = g.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", d => {
        const radiusScale = d3.scaleSqrt()
          .domain([0, d3.max(nodes, n => n.views) || 0])
          .range([3, 20]);
        return radiusScale(d.views);
      })
      .attr("fill", d => color(d.categories[0]));

    if (legendVisible) {
      const legend = svg.append("g")
        .attr("transform", `translate(${width - 250}, 20)`)
        .attr("class", "legend");

      categories.forEach((category, index) => {
        const legendRow = legend.append("g")
          .attr("transform", `translate(0, ${index * 20})`);

        legendRow.append("rect")
          .attr("width", 10)
          .attr("height", 10)
          .attr("fill", color(category));

        legendRow.append("text")
          .attr("x", 20)
          .attr("y", 10)
          .text(category);
      });
    }

    const showTooltip = (event: MouseEvent, d: GraphNode) => {
      const tooltip = d3.select("#tooltip");
      tooltip
        .html(`
          <p style="font-size: 12px; color: #666;">Tap fuera del nodo para cerrar</p>
          <h3 style="font-weight:bold; color: #333;">${d.summary}</h3>   
          <p style="color: #666;"><i>Views:</i> ${d.views}</p>
          <p style="color: #666;"><i>Likes:</i> ${d.likes}</p>
          <p style="color: #666;"><i>Replies:</i> ${d.replies}</p>
          <p style="color: #666;"><i>Bookmarks:</i> ${d.bookmarks}</p>
          <p><a href="/turra/${d.id}" target="_blank" style="color: #007bff; text-decoration: underline;">Abrir en nueva pestaña</a></p>
        `)
        .style("left", `${event.pageX - 100}px`)
        .style("top", `${event.pageY - 200}px`)
        .classed("hidden", false);
    };

    const hideTooltip = () => {
      d3.select("#tooltip").classed("hidden", true);
    };

    node
      .on("click", (event, d) => {
        showTooltip(event, d);
        event.stopPropagation();
      })
      .on("touchstart", (event, d) => {
        showTooltip(event.touches[0], d);
        event.stopPropagation();
        event.preventDefault();
      });

    svg.on("click", hideTooltip);

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1/2, 8])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as unknown as GraphNode).x ?? 0)
        .attr("y1", d => (d.source as unknown as GraphNode).y ?? 0)
        .attr("x2", d => (d.target as unknown as GraphNode).x ?? 0)
        .attr("y2", d => (d.target as unknown as GraphNode).y ?? 0);

      node
        .attr("cx", d => d.x ?? 0)
        .attr("cy", d => d.y ?? 0);
    });

    // Añadir controles de zoom
    const zoomIn = () => {
      svg.transition().call((g) => zoom.scaleBy(g, 1.5));
    };

    const zoomOut = () => {
      svg.transition().call((g) => zoom.scaleBy(g, 0.75));
    };

    const resetZoom = () => {
      svg.transition().call((g) => zoom.transform(g, d3.zoomIdentity));
    };

    // Bind zoom controls
    d3.select('#zoom-in').on('click', zoomIn);
    d3.select('#zoom-out').on('click', zoomOut);
    d3.select('#reset-zoom').on('click', resetZoom);
    d3.select('#show-help').on('click', () => setHelpVisible(true));

    return () => {
      simulation.stop();
      return undefined;
    };
  }, [nodes, legendVisible]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setHelpVisible(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  return (
    <div className="relative" style={{ height: 'min(calc(100vh - 300px), 800px)' }}>
      {/* Controls */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button
          id="zoom-in"
          className="p-2 bg-whiskey-100 text-whiskey-800 rounded-md hover:bg-whiskey-200"
          aria-label="Acercar"
        >
          <FaSearchPlus />
        </button>
        <button
          id="zoom-out"
          className="p-2 bg-whiskey-100 text-whiskey-800 rounded-md hover:bg-whiskey-200"
          aria-label="Alejar"
        >
          <FaSearchMinus />
        </button>
        <button
          id="reset-zoom"
          className="p-2 bg-whiskey-100 text-whiskey-800 rounded-md hover:bg-whiskey-200"
          aria-label="Restablecer zoom"
        >
          <FaExpand />
        </button>
      </div>

      {/* Legend button */}
      <button 
        onClick={() => setLegendVisible(!legendVisible)}
        className="absolute top-4 right-4 z-10 px-4 py-2 bg-whiskey-100 text-whiskey-800 rounded-md hover:bg-whiskey-200"
      >
        {legendVisible ? 'Ocultar leyenda' : 'Mostrar leyenda'}
      </button>

      {/* Help Modal */}
      {helpVisible && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setHelpVisible(false)}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-lg w-full relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setHelpVisible(false)}
              className="absolute top-4 right-4 text-whiskey-700 hover:text-whiskey-900"
              aria-label="Cerrar"
            >
              <FaTimes />
            </button>
            <h3 className="text-xl font-bold mb-4 text-whiskey-700">Cómo usar el grafo</h3>
            <ul className="space-y-2 text-whiskey-700">
              <li>• Haz clic en los nodos para ver más información</li>
              <li>• Usa la rueda del ratón o los botones de zoom para acercar/alejar</li>
              <li>• Arrastra el grafo para moverte por él</li>
              <li>• Los colores representan las categorías de las turras</li>
              <li>• El tamaño de cada nodo representa sus visualizaciones</li>
            </ul>
            <button
              onClick={() => setHelpVisible(false)}
              className="mt-6 px-4 py-2 bg-whiskey-100 text-whiskey-800 rounded-md hover:bg-whiskey-200 w-full font-bold"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="w-full h-full">
        <svg ref={ref} className="w-full h-full" />
        <div 
          id="tooltip" 
          className="hidden absolute bg-white p-4 rounded-lg shadow-lg max-w-xs w-full"
          style={{ transform: 'translate(-50%, -100%)' }}
        />
      </div>
    </div>
  );
} 
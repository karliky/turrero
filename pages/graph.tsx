import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import Head from "next/head";
import Footer from "../components/footer";
import Header from "../components/header";
import Tweets from "../db/tweets.json";
import styles from './graph.module.css';

const TurraNodes: TurraNode[] = require("../db/processed_graph_data.json");

const GraphPage = () => {

  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    
    const nodes = TurraNodes;
    const links = [];

    // Crear enlaces entre los nodos basados en los hilos relacionados
    nodes.forEach((node, index) => {
      node.related_threads.forEach(relatedId => {
        const targetIndex = nodes.findIndex(n => n.id === relatedId);
        if (targetIndex !== -1) {
          links.push({
            source: index,
            target: targetIndex
          });
        }
      });
    });

    const width = document.querySelector('.graph-container').clientWidth;
    const height = document.querySelector('.graph-container').clientHeight;

    const svg = d3.select('.graph-container').append('svg')
      .attr('width', width)
      .attr('height', height);

    // Colores basados en categorías
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const categories = Array.from(new Set(nodes.map(node => node.categories[0])));

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id(d => d.index))
      .force("charge", d3.forceManyBody())
      .force("center", d3.forceCenter(width / 2, height / 2));

    const g = svg.append("g");


    const link = g.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(links)
      .join("line");

    const drag = (simulation) => {
      function dragstarted(event) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
      
      return d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    }

    // Crear una escala para el tamaño de los nodos basado en las vistas
    const radiusScale = d3.scaleSqrt()
      .domain([0, d3.max(nodes, d => d.views)])
      .range([5, 30]);

    const node = g.append("g")
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.5)
      .selectAll("circle")
      .data(nodes)
      .join("g")
      .call(drag(simulation))
      .on("click", function() {
      const d = d3.select(this).datum();
      window.open(`/turra/${d.id}`, "_blank");
      });

    node.append("circle")
      .attr("r", d => radiusScale(d.views)) // Usar la escala para establecer el radio
      .attr("fill", d => color(d.categories[0])); // Usar el primer elemento de categorías para el color

    node.on("mouseover", function(event) {
      // Crear un contenido HTML para el tooltip
      const d = d3.select(this).datum();
    
      d3.select("#tooltip")
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 10) + "px")
        .style("visibility", "visible")
        .style("width", "250px")
        .style("background-color", "#fff")  // Establecer el fondo a blanco o cualquier otro color deseado
        .style("padding", "10px")  // Agregar algo de padding para mejor presentación
        .style("border-radius", "5px")  // Bordes redondeados
        .style("box-shadow", "0px 0px 5px rgba(0,0,0,0.5)")  // Sombra para el tooltip
        .html(`<div>
            <p style="font-size: 12px;">Click para abrir en nueva pestaña</p>
            <h3 style="font-weight:bold;">${d.summary}</h3>   
            <p><i>Views:</i> ${d.views}</p>
            <p><i>Likes:</i> ${d.likes}</p>
            <p><i>Replies:</i> ${d.replies}</p>
            <p><i>Bookmarks:</i> ${d.bookmarks}</p>
          </div>`);  
    })
    .on("mouseout", function(d) {
      
        d3.select("#tooltip")
          .style("visibility", "hidden");
      
    });
    

    const zoom = d3.zoom()
    .scaleExtent([1 / 2, 8])
    .on("zoom", (event) => {
      g.attr("transform", event.transform);
    });

  svg.call(zoom);

  // Adding legend
  const legend = svg.append("g")
    .attr("transform", `translate(${width - 250}, 20)`);

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

   simulation.on("tick", () => {
    link
      .attr("x1", d => d.source.x)
      .attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x)
      .attr("y2", d => d.target.y);

    node
      .attr("transform", d => `translate(${d.x}, ${d.y})`);
  });

  return svg.node();
}, []);

  const title = `Grafo de Turras`;
  const summary = `Grafo de como se relacionan los distintos hilos de turras entre si, por categorías, el tamaño de los nodos se corresponden con el número de views de cada hilo.`;
return (
  <div>
    <Head>
      <title>{title}</title>
      <meta content="text/html; charset=UTF-8" name="Content-Type" />
      <meta name="viewport" content="initial-scale=1.0, width=device-width" />

      <meta name="description" content={summary} key="desc" />
      <meta property='og:url' content='https://turrero.vercel.app/about'/>
      <meta property="og:title" content="Sobre el proyecto de El Turrero Post - Las turras de Javier G. Recuenco" />
      <meta property="og:description" content={summary} />
      <meta property="og:image" content="https://turrero.vercel.app/promo.png"/>
      <meta name="twitter:card" content="summary_large_image"/>
      <meta name="twitter:site" content="@recuenco"/>
      <meta name="twitter:creator" content="@k4rliky"/>
      <meta name="twitter:title" content="Sobre el proyecto de El Turrero Post - Las turras de Javier G. Recuenco"/>
      <meta name="twitter:description" content={summary}/>
      <meta name="twitter:image" content="https://turrero.vercel.app/promo.png"></meta>

    </Head>
    <div>
      <div className={styles.wrapper}>
        <Header totalTweets={Tweets.length} />
        <div className={styles.content}>
          <div className="graph-container" style={{ width: '100vw', height: '100vh' }}>
            <svg ref={ref} style={{ width: '1vw', height: '1vh' }} />
            <div id="tooltip" style={{position: 'absolute', visibility: 'hidden', backgroundColor: 'white', padding: '5px', borderRadius: '5px'}}></div>
          </div>
          </div>
        <Footer />
      </div>
    </div>
  </div>
);
};

export default GraphPage;

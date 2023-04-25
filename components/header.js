import styles from './turra.module.css';
export default function Header({ children, totalTweets }) {
    return <div className='header'>
    <h1 className='h1'><a href="/">El <span className='brand'>Turrero Post</span></a></h1>
    <h2 className='h2'>La colección curada y ordenada de las publicaciones de Javier. G. Recuenco sobre las ciencias de la complejidad, CPS, Factor-X, etc...</h2>
    <h3 className='h3'>Hay un total de {totalTweets} turras, la última actualización fue el {`${new Date().toLocaleDateString("es-ES")}`}.</h3>
    {children && children()}
    <style jsx>{`
    .header h1 a {
      text-decoration: none;
      font-size: inherit;
      color: inherit;
    }
    `}</style>
  </div>;
}
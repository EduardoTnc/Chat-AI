import { assets } from '../../assets/assets'

const Footer = () => {
  return (
    <footer className='mt-24 bg-background-primary text-white flex flex-col items-center justify-center gap-[20px] p-[20px 8vw] pt-20' id='footer'>
      <div className='w-[80%] m-auto lg:grid lg:grid-cols-[2fr_1fr_1fr] gap-[80px]'>
        <div className="flex flex-col gap-[10px] mb-6">
          {/* <img src={assets.logo} alt="" className='w-[150px]'/> */}
          <p className='text-2xl font-bold text-tomato'>El Buen Gusto</p>
          <p>Descubre la auténtica experiencia culinaria de El Buen Gusto. Ofrecemos platos preparados con los mejores ingredientes, entregados directamente a tu puerta. Nuestro compromiso es brindar sabores excepcionales y un servicio de calidad para satisfacer tu paladar.</p>
          <div className='flex gap-[20px]'>
            <img src={assets.facebook_icon} alt="" className='w-[40px] cursor-pointer'/>
            <img src={assets.twitter_icon} alt="" className='w-[40px] cursor-pointer'/>
            <img src={assets.linkedin_icon} alt="" className='w-[40px] cursor-pointer'/>
          </div>
        </div>
        <div className="flex flex-col gap-[10px] mb-6">
          <h2 className='text-3xl font-bold '>Enlaces</h2>
          <ul className='flex flex-col gap-[4px]'>
            <li className='cursor-pointer hover:text-tomato transition-all duration-300'>Inicio</li>
            <li className='cursor-pointer hover:text-tomato transition-all duration-300'>Acerca de nosotros</li>
            <li className='cursor-pointer hover:text-tomato transition-all duration-300'>Envíos</li>
            <li className='cursor-pointer hover:text-tomato transition-all duration-300'>Política de Privacidad</li>
          </ul>
        </div>
        <div className="flex flex-col gap-[4px] mb-6">
          <h2 className='text-3xl font-bold'>Contactanos</h2>
          <p className="flex items-center cursor-pointer hover:text-tomato transition-duration-300"><a href="https://www.google.com/maps/place/Calle+Los+Sauces+123,+Lima,+Per%C3%BA" target="_blank" rel="noopener noreferrer">Calle Los Sauces 123, Lima, Perú</a></p>
          <p className="flex items-center cursor-pointer hover:text-tomato transition-duration-300"><a href="tel:+51987654321">+51 987 654 321</a></p>
          <p className="flex items-center cursor-pointer hover:text-tomato transition-duration-300"><a href="mailto:elbuengusto@gmail.com">elbuengusto@gmail.com</a></p>
        </div>
      </div>
      <hr className='w-[80%] m-5 bg-gray-700'/>
      <p className='text-center text-[14px] mb-5'>© 2025 El Buen Gusto. Todos los derechos reservados.</p>
    </footer>
  )
}

export default Footer
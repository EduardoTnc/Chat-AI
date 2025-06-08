import header_img from '/header_img.png'
import SimpleParallax from 'simple-parallax-js'

const Header = () => {
  return (
    <div className='text-white relative h-[70vw] md:h-[42vw] 2xl:h-[34vw] m-[30px auto] rounded-2xl overflow-hidden'>
      <SimpleParallax scale={1.3} orientation='bottom' delay={1}>
        <img src={header_img} alt="Header background" className="absolute h-full object-cover md:object-left z-10" />
      </SimpleParallax>
      <div className='absolute flex flex-col items-start gap-[1.5vw] md:max-w-1/2 bottom-[10%] left-[6vw] z-20 animate-fade-in-down'>
        <h2 className='text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold'>Ordena tu comida favorita en minutos</h2>
        <p className='hidden sm:block text-[16px] lg:text-2xl'>Elige tus platillos favoritos y disfruta de una comida deliciosa en casa</p>
        <button className='border border-tomato px-5 py-2 rounded-full font-bold bg-white text-tomato hover:bg-tomato hover:text-white hover:translate-y-[-2px] hover:shadow-[0_2px_2px_0px_#0005] transition-all duration-300 cursor-pointer '>Ver Menú</button>
      </div>
    </div>
  )
}

export default Header
import {menu_list} from "../../assets/assets"

const ExplorarMenu = ({categoria, setCategoria}) => {
  
  return (
    <div className='mt-8 flex flex-col gap-2.5 ' id='explorar-menu'>
      <h2 className="text-4xl font-bold">Explora nuestros menús</h2>
      <p className='text-2xl'>Elige tus platillos favoritos y disfruta de una comida deliciosa en casa</p>
      <div className='flex justify-between items-center gap-8 text-center mx-5 overflow-x-scroll [&::-webkit-scrollbar]:hidden'>
        {
          menu_list.map((item, index) => (
            <div onClick={() => setCategoria(prev => prev === item.menu_name ? "Todos": item.menu_name)} key={index} className=''>
              <img src={item.menu_image} alt="" className={`w-[7.5vw] min-w-[80px] cursor-pointer rounded-full transition-all duration-300  ${categoria === item.menu_name ? "border-4 border-tomato" : ""}`} />
              <p className='text-azul-pastel mt-2.5 cursor-pointer text-[max(1.4vw, 16px)]'>{item.menu_name}</p>
            </div>
          ))
        }
      </div>
      <hr className='mx-2.5 h-0.5 bg-azul-pastel/5 border-0' />
    </div>
  )
}

export default ExplorarMenu
import { useEffect, useState } from 'react';
import { getCategories } from '../../api/categoryService';

const ExplorarMenu = ({ categoria, setCategoria }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        setCategories(data);
      } catch (err) {
        console.error('Error fetching categories:', err);
        setError('No se pudieron cargar las categorías');
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <div className='mt-8 flex flex-col gap-2.5' id='explorar-menu'>
        <h2 className="text-4xl font-bold">Explora nuestros menús</h2>
        <p className='text-2xl'>Cargando categorías...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className='mt-8 flex flex-col gap-2.5' id='explorar-menu'>
        <h2 className="text-4xl font-bold">Explora nuestros menús</h2>
        <p className='text-2xl text-red-500'>{error}</p>
      </div>
    );
  }

  return (
    <div className='mt-8 flex flex-col gap-2.5' id='explorar-menu'>
      <h2 className="text-4xl font-bold">Explora nuestros menús</h2>
      <p className='text-2xl'>Elige tus platillos favoritos y disfruta de una comida deliciosa en casa</p>
      <div className='flex justify-start items-center gap-8 text-center mx-5 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden'>
        {/* Default "Todos" option */}
        <div 
          onClick={() => setCategoria("Todos")} 
          className='flex flex-col items-center min-w-[80px] flex-shrink-0'
        >
          <div className={`w-20 h-20 rounded-full flex items-center justify-center bg-gray-100 cursor-pointer transition-all duration-300 ${categoria === "Todos" ? "border-4 border-tomato" : ""}`}>
            <span className="text-gray-500">Todos</span>
          </div>
          <p className='text-azul-pastel mt-2.5 cursor-pointer text-[max(1.4vw, 16px)]'>Todos</p>
        </div>

        {/* Dynamic categories */}
        {categories.map((category) => (
          <div 
            key={category._id} 
            onClick={() => setCategoria(category.name)}
            className='flex flex-col items-center min-w-[80px] flex-shrink-0'
          >
            <div className={`w-20 h-20 rounded-full overflow-hidden flex items-center justify-center bg-gray-100 cursor-pointer transition-all duration-300 ${categoria === category.name ? "border-4 border-tomato" : ""}`}>
              {category.imageUrl ? (
                <>
                  <img 
                    src={`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/v1/images/${encodeURIComponent(category.imageUrl.replace(/^[\\/]/, ''))}`} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      console.error('Error loading image:', category.imageUrl);
                      console.error('Full image URL:', e.target.src);
                      e.target.style.display = 'none';
                      const fallback = e.target.nextElementSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                  <span className="hidden items-center justify-center w-full h-full text-gray-500 text-sm text-center">
                    {category.name.charAt(0).toUpperCase()}
                  </span>
                </>
              ) : (
                <span className="text-gray-500 text-sm text-center px-2 flex items-center justify-center w-full h-full">
                  {category.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <p className='text-azul-pastel mt-2.5 cursor-pointer text-[max(1.4vw, 16px)] text-center'>
              {category.name}
            </p>
          </div>
        ))}
      </div>
      <hr className='mx-2.5 h-0.5 bg-azul-pastel/5 border-0' />
    </div>
  );
};

export default ExplorarMenu;
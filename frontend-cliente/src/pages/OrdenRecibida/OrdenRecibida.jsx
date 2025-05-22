import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

const OrdenRecibida = () => {

  const { orderId } = useParams();
  const [searchParams] = useSearchParams();
  const success = searchParams.get("success") === "true";

  console.log(success, orderId)

  const navigate = useNavigate();

  return (
    <div className={`mt-24 flex flex-col items-center gap-2.5 p-5 bg-gray-200 rounded-lg shadow ${success ? "bg-green-100" : "bg-red-100"}`}>
      <h2 className='text-[32px] font-semibold'>Orden Recibida</h2>
      <p className='text-[24px]'>Gracias por tu compra</p>
      <p className='text-[24px]'>El ID de tu orden es: {orderId}</p>
      {success
        ? (<>
          <p className='text-[24px] text-green-700 px-5'>Orden creada exitosamente</p>
          <button onClick={() => navigate("/mis-ordenes")} className='text-[16px] bg-tomato text-white p-2.5 rounded-full px-5 mt-2.5 cursor-pointer'>Ver todas mis ordenes</button>
        </>)
        : (<>
          <p className='text-[16px] text-red-700 px-5'>Hubo un error al crear la orden</p>
          <button onClick={() => navigate("/carrito")} className='text-[16px] bg-tomato text-white p-2.5 rounded-full px-5 mt-2.5 cursor-pointer'>Intentar de nuevo</button>
        </>)}
    </div>
  )
}

export default OrdenRecibida
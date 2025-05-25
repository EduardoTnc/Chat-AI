import React from 'react';
import {assets} from '../../../assets/assets'

const AppDownload = () => {
  return (
    <div className='m-auto mt-24' id='app-download'>
      <p className='text-center font-semibold text-4xl md:text-6xl '>Para Una Mejor Experiencia, Descarga Nuestra App!</p>
      <div className='flex flex-col md:flex-row items-center  gap-[20px] justify-center mt-[40px]'>
        <img src={assets.play_store} alt="" className='cursor-pointer hover:scale-110 transition-transform w-[200px] md:w-[250px]'/>
        <img src={assets.app_store} alt=""  className='cursor-pointer hover:scale-110 transition-transform w-[200px] md:w-[250px]'/>
      </div>
    </div>
  )
}

export default AppDownload
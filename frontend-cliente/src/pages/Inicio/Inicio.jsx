import React from 'react'
import Header from '../../components/Header/Header'
import ExplorarMenu from '../../components/ExplorarMenu/ExplorarMenu'
import { useState } from 'react'
import MostrarPlatos from '../../components/MostrarPlatos/MostrarPlatos'
import AppDownload from '../../components/AppDownload/AppDownload'

const Inicio = () => {

  const [categoria, setCategoria] = useState("Todos")

  return (
    <div>
      <Header />
      <ExplorarMenu categoria={categoria} setCategoria={setCategoria} />
      <MostrarPlatos categoria={categoria} />
    </div>
  )
}

export default Inicio
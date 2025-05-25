import React from 'react'
import Header from '../../components/Page Inicio/Header'
import ExplorarMenu from '../../components/Page Inicio/ExplorarMenu'
import { useState } from 'react'
import MostrarPlatos from '../../components/Page Inicio/MostrarPlatos'

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
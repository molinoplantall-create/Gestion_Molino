import React, { useState } from 'react'; 
import { BarChart3, PieChart, Download, Filter, Calendar, TrendingUp, TrendingDown, MessageSquare, FileText, Printer } from 'lucide-react';

const Reportes: React.FC = () => {
  const [dateRange, setDateRange] = useState('month');
  const [reportType, setReportType] = useState('general');

  // Datos para gráficos
  const monthlyData = [
    { month: 'Ene', sacos: 420, clientes: 8 },
    { month: 'Feb', sacos: 380, clientes: 7 },
    { month: 'Mar', sacos: 450, clientes: 9 },
    { month: 'Abr', sacos: 520, clientes: 10 },
    { month: 'May', sacos: 480, clientes: 9 },
    { month: 'Jun', sacos: 600, clientes: 12 },
  ];

  const millData = [
    { name: 'Molino I', value: 1250, color: 'bg-blue-500' },
    { name: 'Molino II', value: 980, color: 'bg-green-500' },
    { name: 'Molino III', value: 890, color: 'bg-orange-500' },
    { name: 'Molino IV', value: 1100, color: 'bg-purple-500' },
  ];

  const mineralData = [
    { name: 'Óxido', value: 65, color: 'bg-blue-500' },
    { name: 'Sulfuro', value: 35, color: 'bg-yellow-500' },
  ];

  const topClients = [
    { name: 'Minera Andina SA', sacos: 1250, change: '+12%' },
    { name: 'Compañía Minerales', sacos: 980, change: '+8%' },
    { name: 'Empresa Extractora', sacos: 890, change: '+15%' },
    { name: 'Minerales del Sur', sacos: 850, change: '-5%' },
    { name: 'Sociedad Minera', sacos: 750, change: '+20%' },
  ];

  const maxSacos = Math.max(...monthlyData.map(d => d.sacos));
  const maxMillSacos = Math.max(...millData.map(d => d.value));

  // Funciones para manejar las acciones de los botones
  const handleExportExcel = () => {
    console.log('Exportando a Excel...');
    // Aquí iría la lógica para exportar a Excel
    alert('Funcionalidad de exportar a Excel activada');
  };

  const handleSendWhatsApp = () => {
    console.log('Enviando por WhatsApp...');
    // Aquí iría la lógica para enviar por WhatsApp
    alert('Funcionalidad de WhatsApp activada');
  };

  const handlePrint = () => {
    console.log('Imprimiendo reporte...');
    window.print();
  };

  const handleGeneratePDF = () => {
    console.log('Generando PDF...');
    // Aquí iría la lógica para generar PDF
    alert('Funcionalidad de generar PDF activada');
  };

  const handleApplyFilters = () => {
    console.log('Aplicando filtros...');
    // Aquí iría la lógica para aplicar filtros
    alert('Filtros aplicados');
  };

  const handleClearFilters = () => {
    console.log('Limpiando filtros...');
    setDateRange('month');
    setReportType('general');
    alert('Filtros limpiados');
  };

  const handleSendReports = () => {
    console.log('Enviando reportes masivos...');
    // Aquí iría la lógica para envío masivo
    alert('Envío masivo de reportes activado');
  };

  return (
    <div className="space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes Analíticos</h1>
          <p className="text-gray-600 mt-1">Estadísticas y análisis de producción</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          <button 
            className="btn-primary flex items-center whitespace-nowrap"
            onClick={handleExportExcel}
          >
            <Download size={18} className="mr-2" />
            Exportar Excel
          </button>
          <button 
            className="btn-secondary flex items-center whitespace-nowrap"
            onClick={handleSendWhatsApp}
          >
            <MessageSquare size={18} className="mr-2" />
            Enviar WhatsApp
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 md:p-6 border">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="input-field pl-10 w-full"
              >
                <option value="week">Última semana</option>
                <option value="month">Este mes</option>
                <option value="quarter">Este trimestre</option>
                <option value="year">Este año</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="input-field w-full"
            >
              <option value="general">General</option>
              <option value="production">Producción</option>
              <option value="clients">Clientes</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="efficiency">Eficiencia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Molino</label>
            <select className="input-field w-full">
              <option value="all">Todos los molinos</option>
              <option value="1">Molino I</option>
              <option value="2">Molino II</option>
              <option value="3">Molino III</option>
              <option value="4">Molino IV</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mineral</label>
            <select className="input-field w-full">
              <option value="all">Todos</option>
              <option value="OXIDO">Óxido</option>
              <option value="SULFURO">Sulfuro</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button 
            className="px-4 py-2 bg-primary-50 text-primary-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap"
            onClick={handleApplyFilters}
          >
            <Filter size={16} className="inline mr-2" />
            Aplicar filtros
          </button>
          <button 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium whitespace-nowrap"
            onClick={handleClearFilters}
          >
            Limpiar filtros
          </button>
          <button 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap"
            onClick={handlePrint}
          >
            <Printer size={16} className="inline mr-2" />
            Imprimir
          </button>
          <button 
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium flex items-center whitespace-nowrap"
            onClick={handleGeneratePDF}
          >
            <FileText size={16} className="inline mr-2" />
            Generar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Sacos Procesados</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-2">4,220</p>
              <div className="flex flex-wrap items-center mt-2 text-sm">
                <TrendingUp className="text-green-500 mr-1" size={16} />
                <span className="text-green-600 font-medium">+12%</span>
                <span className="text-gray-500 ml-2 whitespace-nowrap">vs mes anterior</span>
              </div>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <BarChart3 className="text-blue-600" size={20} md:size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Clientes Activos</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-2">12</p>
              <div className="flex flex-wrap items-center mt-2 text-sm">
                <TrendingUp className="text-green-500 mr-1" size={16} />
                <span className="text-green-600 font-medium">+2</span>
                <span className="text-gray-500 ml-2 whitespace-nowrap">nuevos este mes</span>
              </div>
            </div>
            <div className="p-3 bg-green-100 rounded-xl">
              <PieChart className="text-green-600" size={20} md:size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Eficiencia</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-2">94%</p>
              <div className="flex flex-wrap items-center mt-2 text-sm">
                <TrendingUp className="text-green-500 mr-1" size={16} />
                <span className="text-green-600 font-medium">+3%</span>
                <span className="text-gray-500 ml-2 whitespace-nowrap">mejora</span>
              </div>
            </div>
            <div className="p-3 bg-orange-100 rounded-xl">
              <TrendingUp className="text-orange-600" size={20} md:size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tiempo Promedio</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 mt-2">2.1h</p>
              <div className="flex flex-wrap items-center mt-2 text-sm">
                <TrendingDown className="text-green-500 mr-1" size={16} />
                <span className="text-green-600 font-medium">-0.3h</span>
                <span className="text-gray-500 ml-2 whitespace-nowrap">optimización</span>
              </div>
            </div>
            <div className="p-3 bg-purple-100 rounded-xl">
              <PieChart className="text-purple-600" size={20} md:size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Production Chart */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Producción Mensual</h3>
              <p className="text-gray-600 text-sm">Sacos procesados por mes</p>
            </div>
            <BarChart3 className="text-primary-600" size={20} md:size={24} />
          </div>
          
          <div className="space-y-4">
            {monthlyData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-16 min-w-[4rem]">
                  <span className="text-sm font-medium text-gray-700">{item.month}</span>
                </div>
                <div className="flex-1 ml-4">
                  <div className="relative">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>{item.sacos.toLocaleString()} sacos</span>
                      <span>{item.clientes} clientes</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-primary-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(item.sacos / maxSacos) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Production by Mill */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Producción por Molino</h3>
              <p className="text-gray-600 text-sm">Distribución total</p>
            </div>
            <PieChart className="text-primary-600" size={20} md:size={24} />
          </div>
          
          <div className="space-y-4">
            {millData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-24 min-w-[6rem]">
                  <span className="text-sm font-medium text-gray-700">{item.name}</span>
                </div>
                <div className="flex-1 ml-4">
                  <div className="relative">
                    <div className="flex justify-between text-sm text-gray-500 mb-1">
                      <span>{item.value.toLocaleString()} sacos</span>
                      <span>{((item.value / maxMillSacos) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full ${item.color} transition-all duration-500`}
                        style={{ width: `${(item.value / maxMillSacos) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mineral Distribution */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 md:mb-6">Distribución por Mineral</h3>
          <div className="space-y-4">
            {mineralData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${item.color} mr-3`}></div>
                  <span className="text-gray-700">{item.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-medium text-gray-900">{item.value}%</span>
                  <div className="w-20 md:w-24 h-2 bg-gray-200 rounded-full ml-3">
                    <div 
                      className={`h-2 rounded-full ${item.color}`}
                      style={{ width: `${item.value}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-2xl p-4 md:p-6 border lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 md:mb-6">Top 5 Clientes</h3>
          <div className="space-y-3 md:space-y-4">
            {topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 md:p-4 hover:bg-gray-50 rounded-xl">
                <div className="flex items-center min-w-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 bg-gray-100 rounded-lg flex items-center justify-center mr-3 md:mr-4 flex-shrink-0">
                    <span className="font-bold text-gray-700 text-sm md:text-base">{index + 1}</span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-medium text-gray-900 truncate">{client.name}</h4>
                    <div className="text-sm text-gray-500">{client.sacos.toLocaleString()} sacos</div>
                  </div>
                </div>
                <div className={`flex items-center flex-shrink-0 ml-2 ${
                  client.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {client.change.startsWith('+') ? (
                    <TrendingUp size={16} className="mr-1" />
                  ) : (
                    <TrendingDown size={16} className="mr-1" />
                  )}
                  <span className="font-medium text-sm md:text-base">{client.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp Mass Send */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <MessageSquare className="text-blue-600 mr-3" size={20} md:size={24} />
            <div>
              <h3 className="font-semibold text-blue-900 text-base md:text-lg">Envío Masivo por WhatsApp</h3>
              <p className="text-blue-700 text-sm">Envíe reportes a múltiples clientes</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select className="input-field w-full sm:w-auto">
              <option>Seleccionar clientes</option>
              <option>Todos los clientes</option>
              <option>Clientes activos este mes</option>
              <option>Clientes específicos</option>
            </select>
            <button 
              className="btn-primary whitespace-nowrap"
              onClick={handleSendReports}
            >
              Enviar Reportes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
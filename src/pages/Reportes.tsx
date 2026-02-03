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
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reportes Analíticos</h1>
          <p className="text-slate-500 mt-1">Estadísticas y análisis de producción</p>
        </div>
        <div className="mt-4 sm:mt-0 flex flex-wrap gap-3">
          <button
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-sm font-medium whitespace-nowrap"
            onClick={handleExportExcel}
          >
            <Download size={18} strokeWidth={1.5} className="mr-2" />
            Exportar Excel
          </button>
          <button
            className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-colors shadow-sm font-medium whitespace-nowrap"
            onClick={handleSendWhatsApp}
          >
            <MessageSquare size={18} strokeWidth={1.5} className="mr-2" />
            Enviar WhatsApp
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Período</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} strokeWidth={1.5} />
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Tipo de Reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
            >
              <option value="general">General</option>
              <option value="production">Producción</option>
              <option value="clients">Clientes</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="efficiency">Eficiencia</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Molino</label>
            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
              <option value="all">Todos los molinos</option>
              <option value="1">Molino I</option>
              <option value="2">Molino II</option>
              <option value="3">Molino III</option>
              <option value="4">Molino IV</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Mineral</label>
            <select className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer">
              <option value="all">Todos</option>
              <option value="OXIDO">Óxido</option>
              <option value="SULFURO">Sulfuro</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-100">
          <button
            className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-sm font-medium flex items-center whitespace-nowrap transition-colors"
            onClick={handleApplyFilters}
          >
            <Filter size={16} strokeWidth={1.5} className="inline mr-2" />
            Aplicar filtros
          </button>
          <button
            className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium whitespace-nowrap transition-colors"
            onClick={handleClearFilters}
          >
            Limpiar filtros
          </button>
          <div className="flex-grow"></div>
          <button
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium flex items-center whitespace-nowrap transition-colors shadow-sm"
            onClick={handlePrint}
          >
            <Printer size={16} strokeWidth={1.5} className="inline mr-2" />
            Imprimir
          </button>
          <button
            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-medium flex items-center whitespace-nowrap transition-colors shadow-sm"
            onClick={handleGeneratePDF}
          >
            <FileText size={16} strokeWidth={1.5} className="inline mr-2" />
            Generar PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Sacos Procesados</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">4,220</p>
              <div className="flex flex-wrap items-center mt-2 text-xs font-medium">
                <span className="flex items-center text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                  <TrendingUp size={14} strokeWidth={1.5} className="mr-1" />
                  +12%
                </span>
                <span className="text-slate-400 ml-2 whitespace-nowrap">vs mes anterior</span>
              </div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <BarChart3 className="text-indigo-600" size={24} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Clientes Activos</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">12</p>
              <div className="flex flex-wrap items-center mt-2 text-xs font-medium">
                <span className="flex items-center text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                  <TrendingUp size={14} strokeWidth={1.5} className="mr-1" />
                  +2
                </span>
                <span className="text-slate-400 ml-2 whitespace-nowrap">nuevos este mes</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
              <PieChart className="text-emerald-600" size={24} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Eficiencia</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">94%</p>
              <div className="flex flex-wrap items-center mt-2 text-xs font-medium">
                <span className="flex items-center text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                  <TrendingUp size={14} strokeWidth={1.5} className="mr-1" />
                  +3%
                </span>
                <span className="text-slate-400 ml-2 whitespace-nowrap">mejora</span>
              </div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
              <TrendingUp className="text-amber-600" size={24} strokeWidth={1.5} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Tiempo Promedio</p>
              <p className="text-2xl font-bold text-slate-900 mt-2">2.1h</p>
              <div className="flex flex-wrap items-center mt-2 text-xs font-medium">
                <span className="flex items-center text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-100">
                  <TrendingDown size={14} strokeWidth={1.5} className="mr-1" />
                  -0.3h
                </span>
                <span className="text-slate-400 ml-2 whitespace-nowrap">optimización</span>
              </div>
            </div>
            <div className="p-3 bg-violet-50 rounded-xl border border-violet-100">
              <PieChart className="text-violet-600" size={24} strokeWidth={1.5} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Production Chart */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Producción Mensual</h3>
              <p className="text-slate-500 text-sm">Sacos procesados por mes</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <BarChart3 className="text-indigo-600" size={20} strokeWidth={1.5} />
            </div>
          </div>

          <div className="space-y-4">
            {monthlyData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-16 min-w-[4rem]">
                  <span className="text-sm font-medium text-slate-700">{item.month}</span>
                </div>
                <div className="flex-1 ml-4">
                  <div className="relative">
                    <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                      <span>{item.sacos.toLocaleString()} sacos</span>
                      <span>{item.clientes} clientes</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 hover:bg-indigo-500"
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
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Producción por Molino</h3>
              <p className="text-slate-500 text-sm">Distribución total</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-lg">
              <PieChart className="text-indigo-600" size={20} strokeWidth={1.5} />
            </div>
          </div>

          <div className="space-y-4">
            {millData.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-24 min-w-[6rem]">
                  <span className="text-sm font-medium text-slate-700">{item.name}</span>
                </div>
                <div className="flex-1 ml-4">
                  <div className="relative">
                    <div className="flex justify-between text-xs font-medium text-slate-500 mb-1.5">
                      <span>{item.value.toLocaleString()} sacos</span>
                      <span>{((item.value / maxMillSacos) * 100).toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-2.5 rounded-full ${item.color} transition-all duration-500 opacity-90 hover:opacity-100`}
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
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Distribución por Mineral</h3>
          <div className="space-y-5">
            {mineralData.map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full ${item.color} mr-3 ring-2 ring-white ring-offset-1`}></div>
                  <span className="text-slate-700 font-medium">{item.name}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold text-slate-900">{item.value}%</span>
                  <div className="w-20 md:w-24 h-2 bg-slate-100 rounded-full ml-3 overflow-hidden">
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
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top 5 Clientes</h3>
          <div className="space-y-3">
            {topClients.map((client, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center min-w-0">
                  <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0 font-bold text-sm border
                    ${index === 0 ? 'bg-amber-50 text-amber-700 border-amber-100' :
                      index === 1 ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        index === 2 ? 'bg-orange-50 text-orange-700 border-orange-100' :
                          'bg-slate-50 text-slate-500 border-slate-100'}
                  `}>
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{client.name}</h4>
                    <div className="text-sm font-medium text-slate-500">{client.sacos.toLocaleString()} sacos procecesados</div>
                  </div>
                </div>
                <div className={`flex items-center flex-shrink-0 ml-4 px-2.5 py-1 rounded-full text-xs font-bold border ${client.change.startsWith('+')
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                  }`}>
                  {client.change.startsWith('+') ? (
                    <TrendingUp size={14} strokeWidth={2} className="mr-1" />
                  ) : (
                    <TrendingDown size={14} strokeWidth={2} className="mr-1" />
                  )}
                  <span>{client.change}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* WhatsApp Mass Send */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between">
          <div className="flex items-center mb-4 md:mb-0">
            <div className="p-3 bg-white rounded-xl shadow-sm border border-indigo-100 mr-4">
              <MessageSquare className="text-indigo-600" size={24} strokeWidth={1.5} />
            </div>
            <div>
              <h3 className="font-bold text-indigo-900 text-lg">Envío Masivo por WhatsApp</h3>
              <p className="text-indigo-700 text-sm opacity-80">Envíe reportes analíticos a múltiples clientes simultáneamente</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select className="px-4 py-2.5 bg-white border border-indigo-200 rounded-xl text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium sm:w-auto shadow-sm">
              <option>Seleccionar clientes</option>
              <option>Todos los clientes</option>
              <option>Clientes activos este mes</option>
              <option>Clientes específicos</option>
            </select>
            <button
              className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl font-medium shadow-sm transition-colors whitespace-nowrap flex items-center justify-center"
              onClick={handleSendReports}
            >
              <MessageSquare size={18} strokeWidth={1.5} className="mr-2" />
              Enviar Reportes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;
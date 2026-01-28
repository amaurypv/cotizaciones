// Base de datos local de clientes usando localStorage
const CLIENTS_STORAGE_KEY = 'quimica_guba_clients';

// Obtener todos los clientes guardados
export const getClientsDB = () => {
  try {
    const clients = localStorage.getItem(CLIENTS_STORAGE_KEY);
    return clients ? JSON.parse(clients) : {};
  } catch (error) {
    console.error('Error al obtener clientes:', error);
    return {};
  }
};

// Guardar información de un cliente
export const saveClientData = (clientName, clientData) => {
  try {
    const clients = getClientsDB();
    const normalizedName = clientName.trim().toUpperCase();

    // Guardar solo los campos que tienen información
    const dataToSave = {};
    Object.keys(clientData).forEach(key => {
      if (clientData[key] && clientData[key].trim() !== '') {
        dataToSave[key] = clientData[key].trim();
      }
    });

    // Solo guardar si hay datos útiles
    if (Object.keys(dataToSave).length > 0) {
      clients[normalizedName] = {
        ...clients[normalizedName],
        ...dataToSave,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
    }
  } catch (error) {
    console.error('Error al guardar cliente:', error);
  }
};

// Obtener información de un cliente específico
export const getClientData = (clientName) => {
  try {
    const clients = getClientsDB();
    const normalizedName = clientName.trim().toUpperCase();
    return clients[normalizedName] || {};
  } catch (error) {
    console.error('Error al obtener datos del cliente:', error);
    return {};
  }
};

// Obtener lista de todos los nombres de clientes guardados
export const getClientNames = () => {
  try {
    const clients = getClientsDB();
    return Object.keys(clients).sort();
  } catch (error) {
    console.error('Error al obtener nombres de clientes:', error);
    return [];
  }
};

// Eliminar un cliente
export const deleteClient = (clientName) => {
  try {
    const clients = getClientsDB();
    const normalizedName = clientName.trim().toUpperCase();
    delete clients[normalizedName];
    localStorage.setItem(CLIENTS_STORAGE_KEY, JSON.stringify(clients));
  } catch (error) {
    console.error('Error al eliminar cliente:', error);
  }
};

// Exportar base de datos (para respaldos)
export const exportClientsDB = () => {
  try {
    const clients = getClientsDB();
    const dataStr = JSON.stringify(clients, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `clientes_quimica_guba_${new Date().toISOString().split('T')[0]}.json`;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error al exportar base de datos:', error);
  }
};
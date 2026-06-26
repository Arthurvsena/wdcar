const brands = {
  'Volkswagen': ['Gol', 'Polo', 'Virtus', 'T-Cross', 'Nivus', 'Taos', 'Amarok', 'Saveiro', 'Voyage', 'Fox', 'Up!', 'Passat', 'Jetta', 'Tiguan', 'ID.4', 'Fusca'],
  'Chevrolet': ['Onix', 'Onix Plus', 'Prisma', 'Cruze', 'Tracker', 'S10', 'Montana', 'Spin', 'Cobalt', 'Classic', 'Equinox', 'Camaro', 'Trailblazer', 'Corsa', 'Corsa Sedan', 'Agile', 'Zafira', 'Astra', 'Vectra', 'Meriva'],
  'Fiat': ['Strada', 'Uno', 'Mobi', 'Argo', 'Cronos', 'Toro', 'Pulse', 'Fastback', 'Ducato', 'Fiorino', 'Palio', 'Siena', 'Punto', 'Bravo', 'Doblò', '500'],
  'Ford': ['Ka', 'EcoSport', 'Ranger', 'Focus', 'Fiesta', 'Territory', 'Mustang', 'Edge', 'Fusion', 'Bronco Sport', 'Maverick', 'Transit'],
  'Toyota': ['Corolla', 'Hilux', 'Etios', 'Yaris', 'SW4', 'Corolla Cross', 'RAV4', 'Camry', 'Prius', 'Land Cruiser'],
  'Honda': ['Civic', 'HR-V', 'Fit', 'City', 'CR-V', 'WR-V', 'Accord', 'ZR-V', 'Passport'],
  'Renault': ['Sandero', 'Logan', 'Duster', 'Kwid', 'Captur', 'Oroch', 'Stepway', 'Megan', 'Fluence', 'Master', 'Kangoo'],
  'Nissan': ['Kicks', 'Frontier', 'Versa', 'Sentra', 'Leaf', 'March', 'Altima'],
  'Hyundai': ['HB20', 'Creta', 'Tucson', 'Santa Fe', 'ix35', 'Azera', 'Elantra', 'Sonata', 'HR'],
  'Jeep': ['Renegade', 'Compass', 'Cherokee', 'Wrangler', 'Grand Cherokee', 'Commander', 'Gladiator'],
  'BMW': ['Série 1', 'Série 2', 'Série 3', 'Série 5', 'X1', 'X2', 'X3', 'X4', 'X5', 'X6', 'iX', 'Z4'],
  'Mercedes-Benz': ['Classe A', 'Classe C', 'Classe E', 'Classe S', 'GLA', 'GLB', 'GLC', 'GLE', 'GLS', 'Sprinter', 'Actros'],
  'Audi': ['A3', 'A4', 'A5', 'A6', 'Q2', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron', 'RS3'],
  'Volvo': ['XC40', 'XC60', 'XC90', 'S60', 'S90', 'V60', 'V90', 'C40'],
  'Mitsubishi': ['L200 Triton', 'Pajero', 'ASX', 'Outlander', 'Eclipse Cross', 'Pajero Sport', 'Lancer'],
  'Kia': ['Sportage', 'Cerato', 'Seltos', 'Stonic', 'Picanto', 'Sorento', 'Mohave', 'Carnival'],
  'Peugeot': ['206', '207', '208', '2008', '3008', '307', '308', '408', '5008', '508', 'Partner', 'Boxer', 'Expert', 'Landtrek', 'Hoggar'],
  'Citroën': ['C3', 'C4 Cactus', 'Aircross', 'Jumpy', 'Berlingo', 'C4 Lounge', 'Grand C4 SpaceTourer'],
  'Chery': ['Tiggo 2', 'Tiggo 3', 'Tiggo 5', 'Tiggo 5X', 'Tiggo 7', 'Tiggo 8', 'QQ', 'Celer'],
  'Caoa Chery': ['Tiggo 5X', 'Tiggo 7', 'Tiggo 8', 'iCar'],
  'JAC': ['T40', 'T50', 'J3', 'J5', 'J6', 'E-J7', 'iEV20'],
  'Suzuki': ['Jimny', 'Vitara', 'Swift', 'S-Cross', 'Baleno'],
  'RAM': ['1500', '2500', '3500'],
  'Land Rover': ['Range Rover Evoque', 'Range Rover Sport', 'Range Rover Velar', 'Discovery', 'Discovery Sport', 'Defender'],
  'Jaguar': ['F-PACE', 'E-PACE', 'I-PACE', 'XE', 'XF', 'F-TYPE'],
  'BMW Motorrad': ['S 1000', 'R 1250 GS', 'K 1600'],
  'Porsche': ['Cayenne', 'Macan', 'Panamera', '911', 'Taycan'],
  'Mini': ['Cooper', 'Cooper S', 'Countryman', 'Clubman'],
  'Subaru': ['Forester', 'Outback', 'XV', 'Impreza', 'WRX'],
  'Iveco': ['Daily', 'Tector', 'Stralis'],
  'Scania': ['R-Series', 'G-Series', 'S-Series'],
  'Daf': ['XF', 'CF', 'LF'],
  'BYD': ['Dolphin', 'Seal', 'Yuan Plus', 'Han', 'Tan', 'King'],
  'GWM': ['Haval H6', 'Ora 03', 'Poer'],
  'Lifan': ['X60', 'Mais 530', 'X50'],
  'Relame': ['Excelsior', 'V8'],
  'Changan': ['CS35', 'CS55', 'CS75'],
};

export function searchBrands(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return Object.keys(brands).filter((brand) => {
    const normalizedBrand = brand.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return normalizedBrand.includes(q);
  });
}

export function getModels(brand) {
  return brands[brand] || [];
}

export function getAllBrands() {
  return Object.keys(brands).sort();
}

export default brands;

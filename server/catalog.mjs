// Product metadata and all generated quotations are demonstration fixtures.
export const DEMO_PRODUCTS = [
  ['corsair-ddr4-3200-32', 'memory', '海盗船', '复仇者 LPX DDR4', '32GB (16GB×2) · 3200MHz · CL16', '2019-01-01', 399, 1299],
  ['kingston-ddr4-3200-16', 'memory', '金士顿', 'FURY Beast DDR4', '16GB (8GB×2) · 3200MHz · CL16', '2021-04-12', 229, 699],
  ['gskill-ddr4-3600-32', 'memory', '芝奇', '焰光戟 DDR4', '32GB (16GB×2) · 3600MHz · CL18', '2020-01-01', 479, 1499],
  ['kingston-ddr5-6000-32', 'memory', '金士顿', 'FURY Beast DDR5', '32GB (16GB×2) · 6000MHz · CL36', '2021-10-27', 649, 2799],
  ['gskill-ddr5-6000-32', 'memory', '芝奇', '焰锋戟 DDR5', '32GB (16GB×2) · 6000MHz · CL30', '2022-08-30', 799, 2199],
  ['corsair-ddr5-6400-64', 'memory', '海盗船', '复仇者 DDR5', '64GB (32GB×2) · 6400MHz · CL32', '2023-05-01', 1499, 3299],
  ['nvidia-rtx-4090', 'gpu', 'NVIDIA', 'GeForce RTX 4090', '24GB GDDR6X · 384-bit · 台式机', '2022-10-12', 13999, 14999],
  ['nvidia-rtx-4070-super', 'gpu', 'NVIDIA', 'GeForce RTX 4070 SUPER', '12GB GDDR6X · 192-bit · 台式机', '2024-01-17', 4299, 4899],
  ['nvidia-rtx-4060', 'gpu', 'NVIDIA', 'GeForce RTX 4060', '8GB GDDR6 · 128-bit · 台式机', '2023-06-29', 1999, 2399],
  ['nvidia-rtx-3080', 'gpu', 'NVIDIA', 'GeForce RTX 3080', '10GB GDDR6X · 320-bit · 台式机', '2020-09-17', 3499, 5499],
  ['nvidia-rtx-3060', 'gpu', 'NVIDIA', 'GeForce RTX 3060', '12GB GDDR6 · 192-bit · 台式机', '2021-02-25', 1699, 2499],
  ['amd-rx-7900xtx', 'gpu', 'AMD', 'Radeon RX 7900 XTX', '24GB GDDR6 · 384-bit · 台式机', '2022-12-13', 6499, 7999],
  ['amd-ryzen-7800x3d', 'cpu', 'AMD', 'Ryzen 7 7800X3D', '8 核 16 线程 · AM5 · 盒装', '2023-04-06', 2399, 3299],
  ['amd-ryzen-9800x3d', 'cpu', 'AMD', 'Ryzen 7 9800X3D', '8 核 16 线程 · AM5 · 盒装', '2024-11-07', 3199, 3699],
  ['amd-ryzen-5700x', 'cpu', 'AMD', 'Ryzen 7 5700X', '8 核 16 线程 · AM4 · 盒装', '2022-04-04', 899, 1999],
  ['intel-i5-12400f', 'cpu', 'Intel', 'Core i5-12400F', '6 核 12 线程 · LGA1700 · 盒装', '2022-01-04', 699, 1499],
  ['intel-i5-14600kf', 'cpu', 'Intel', 'Core i5-14600KF', '14 核 20 线程 · LGA1700 · 盒装', '2023-10-17', 1599, 2349],
  ['amd-ryzen-9950x', 'cpu', 'AMD', 'Ryzen 9 9950X', '16 核 32 线程 · AM5 · 盒装', '2024-08-15', 3499, 4899],
  ['samsung-980pro-1tb', 'storage', '三星', '980 PRO', '1TB · NVMe M.2 · PCIe 4.0', '2020-09-22', 599, 1899],
  ['samsung-990pro-2tb', 'storage', '三星', '990 PRO', '2TB · NVMe M.2 · PCIe 4.0', '2022-11-01', 1099, 2399],
  ['wd-sn850x-2tb', 'storage', '西部数据', 'WD_BLACK SN850X', '2TB · NVMe M.2 · PCIe 4.0', '2022-08-08', 899, 2199],
  ['wd-sn770-1tb', 'storage', '西部数据', 'WD_BLACK SN770', '1TB · NVMe M.2 · PCIe 4.0', '2022-02-02', 399, 1099],
  ['crucial-mx500-1tb', 'storage', '英睿达', 'MX500', '1TB · SATA 2.5 英寸 · TLC', '2017-12-19', 499, 1099],
  ['seagate-ironwolf-4tb', 'storage', '希捷', '酷狼 IronWolf', '4TB · 机械硬盘 · SATA · CMR', '2019-01-01', 629, 999],
].map(([id, category, brand, name, spec, releaseDate, target, launch]) => ({
  id, category, brand, name, spec, releaseDate, target, launch,
}));

export const DEMO_SOURCES = ['京东自营（演示）', '天猫旗舰店（演示）', '品牌商城（演示）'];

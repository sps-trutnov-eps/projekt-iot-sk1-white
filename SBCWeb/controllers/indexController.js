// Controller pro hlavní stránku
exports.getIndex = (req, res) => {
  res.render('index', { 
    title: 'IoT Server Dashboard',
    projectName: 'Projekt IoT SK1 White'
  });
};

// Controller pro 404 stránku
exports.get404 = (req, res) => {
  res.status(404).render('404', { 
    title: '404 - Stránka nenalezena' 
  });
};

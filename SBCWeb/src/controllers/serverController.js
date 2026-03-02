

const renderServer = (req, res) =>{
  try{
    res.render('servers');
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}


module.exports = {renderServer};
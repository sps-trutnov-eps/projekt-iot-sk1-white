

const renderSettings = (req, res) =>{
  try{
    res.render('settings');
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
}


module.exports = {renderSettings};
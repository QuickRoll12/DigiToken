const Student = require('../models/Student');
const csv = require('csv-parser');
const fs = require('fs');

// @desc    Upload students from CSV
// @route   POST /api/students/upload
// @access  Private/Admin
const uploadStudents = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a CSV file' });
    }

    const results = [];
    const errors = [];
    let processedCount = 0;
    let addedCount = 0;
    let updatedCount = 0;

    // Process the CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => {
        // Validate required fields
        if (!data.name || !data.email || !data.course || !data.year) {
          errors.push({ row: processedCount + 1, error: 'Missing required fields' });
        } else {
          results.push({
            name: data.name,
            email: data.email.toLowerCase(),
            course: data.course,
            year: data.year,
            rollNumber: data.rollNumber || '',
            department: data.department || ''
          });
        }
        processedCount++;
      })
      .on('end', async () => {
        // Remove the temporary file
        fs.unlinkSync(req.file.path);

        // If there are validation errors, return them
        if (errors.length > 0) {
          return res.status(400).json({ 
            message: 'Validation errors in CSV file', 
            errors 
          });
        }

        // Process each student
        for (const student of results) {
          try {
            // Check if student already exists
            const existingStudent = await Student.findOne({ email: student.email });
            
            if (existingStudent) {
              // Update existing student
              await Student.findByIdAndUpdate(existingStudent._id, student);
              updatedCount++;
            } else {
              // Create new student
              await Student.create(student);
              addedCount++;
            }
          } catch (error) {
            errors.push({ 
              email: student.email, 
              error: error.message 
            });
          }
        }

        res.status(200).json({
          message: 'Students processed successfully',
          total: processedCount,
          added: addedCount,
          updated: updatedCount,
          errors
        });
      });
  } catch (error) {
    console.error('Error in uploadStudents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get all students
// @route   GET /api/students
// @access  Private/Admin
const getAllStudents = async (req, res) => {
  try {
    const { course, year, search } = req.query;
    
    // Build filter
    const filter = {};
    if (course) filter.course = course;
    if (year) filter.year = year;
    
    // Add search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { rollNumber: { $regex: search, $options: 'i' } }
      ];
    }
    
    const students = await Student.find(filter).sort({ name: 1 });
    res.status(200).json(students);
  } catch (error) {
    console.error('Error in getAllStudents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get student by ID
// @route   GET /api/students/:id
// @access  Private/Admin
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    res.status(200).json(student);
  } catch (error) {
    console.error('Error in getStudentById:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create a new student
// @route   POST /api/students
// @access  Private/Admin
const createStudent = async (req, res) => {
  try {
    const { name, email, course, year, rollNumber, department } = req.body;
    
    // Check if student already exists
    const existingStudent = await Student.findOne({ email });
    if (existingStudent) {
      return res.status(400).json({ message: 'Student with this email already exists' });
    }
    
    const student = await Student.create({
      name,
      email: email.toLowerCase(),
      course,
      year,
      rollNumber,
      department
    });
    
    res.status(201).json(student);
  } catch (error) {
    console.error('Error in createStudent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update a student
// @route   PUT /api/students/:id
// @access  Private/Admin
const updateStudent = async (req, res) => {
  try {
    const { name, email, course, year, rollNumber, department } = req.body;
    
    // Check if student exists
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    // Check if email is being changed and if it already exists
    if (email && email !== student.email) {
      const existingStudent = await Student.findOne({ email });
      if (existingStudent) {
        return res.status(400).json({ message: 'Student with this email already exists' });
      }
    }
    
    // Update student
    student.name = name || student.name;
    student.email = email ? email.toLowerCase() : student.email;
    student.course = course || student.course;
    student.year = year || student.year;
    student.rollNumber = rollNumber !== undefined ? rollNumber : student.rollNumber;
    student.department = department !== undefined ? department : student.department;
    
    const updatedStudent = await student.save();
    res.status(200).json(updatedStudent);
  } catch (error) {
    console.error('Error in updateStudent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Delete a student
// @route   DELETE /api/students/:id
// @access  Private/Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }
    
    await student.deleteOne();
    res.status(200).json({ message: 'Student removed' });
  } catch (error) {
    console.error('Error in deleteStudent:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get students by filter (course, year)
// @route   GET /api/students/filter
// @access  Private/Admin
const getStudentsByFilter = async (req, res) => {
  try {
    const { course, year } = req.query;
    
    // Build filter
    const filter = {};
    if (course) filter.course = course;
    if (year) filter.year = year;
    
    const students = await Student.find(filter).sort({ name: 1 });
    res.status(200).json(students);
  } catch (error) {
    console.error('Error in getStudentsByFilter:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  uploadStudents,
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentsByFilter
};

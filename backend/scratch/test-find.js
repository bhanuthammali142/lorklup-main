const apiUser = {
  id: 6,
  email: 'bhanuthammali147@gmail.com',
  role: 'student',
  name: 'bhanuthammali',
  hostel_id: '2'
};

const students = [
  {
    "id": "5381ffcd-e569-494b-8397-8bc588631087",
    "hostel_id": 2,
    "user_id": 6,
    "email": "bhanuthammali147@gmail.com"
  }
];

const record = students.find(
  (s) =>
    s.user_id == String(apiUser.id) || s.email === apiUser.email
);

console.log('Record found:', record);

import 'whatwg-fetch';
import Promise from 'promise-polyfill';

// To add to window
if (!window.Promise) {
  window.Promise = Promise;
}


(function() {
  checkCookie();
  getLocation();
  checkUrl();
  google.maps.event.addDomListener(window, 'load', initMap);
})();

var data = {
  mobileVerificationAuthToken : '',
  deviceId: '',
  productCode : "",
  lat : "",
  long : "",
}

var registerationObj = {
  userInfo:{
    phoneNumber : '',
    name : '',
    address : {},
  },
  rememberMe : false,
} 

function initMap() {
  var input = document.getElementById('address');
  var autocomplete = new google.maps.places.Autocomplete(input);
  autocomplete.addListener('place_changed', () => {
    var place = autocomplete.getPlace();
    var locationObj = parseAddress(place);
    registerationObj.userInfo.address = locationObj;
  });
}
 

function getLocation(){
  if( navigator.geolocation ){
    navigator.geolocation.getCurrentPosition(async function(position){
      var addressComponent = await getAddress(position.coords.latitude, position.coords.longitude);
      var locationObj = parseAddress(addressComponent['results'][0]);
      document.getElementById('address').value = addressComponent['results'][0]['formatted_address'];
      registerationObj.userInfo.address = locationObj;    
      // console.log(locationObj);
    });
  }else{
    alert("Sorry, your browser does not support geolocation services.");
  }
}


const getAddress = (lat, lng) => {
  let url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&sensor=true&key=AIzaSyB4DcpkHY2JGvoaqFzyLLSGNDsVnKw3_bE`;
  return fetch(url)
    .then(response => {
      // console.log(response);
      return response.json()
    })
    .catch(err => {
      console.log(err);
    })
}
 
//Submit code and mobile number
document.querySelector('.verificationSubmit').addEventListener('click', function(){        
 
  // error handling for code and mobile fields
  var uniqueCode = document.querySelector('.uniqueCode').value;
  var mobileNumber = document.querySelector('.mobileNumber').value;
  var codeError = document.querySelector('.codeError');        
  var mobileError = document.querySelector('.mobileError');
  var rememberMobile = document.querySelector('.rememberMobile');
  var address = document.querySelector('.address').value;
  var addressError = document.querySelector('.addressError');
  var name = document.querySelector('.name').value;
  var nameError = document.querySelector('.nameError');


  var userCookie = getCookie("rem");
  if(userCookie && userCookie !== ''){
    userCookie = JSON.parse(decodeURIComponent(userCookie));
  }

  if(name === ''){
    nameError.classList.remove('hide');
  }else{
    nameError.classList.add('hide');   
  }
  if(uniqueCode === ''){
    codeError.classList.remove('hide');
  }else{
    codeError.classList.add('hide');   
  }
  if(address === ''){
    addressError.classList.remove('hide');
  }else{
    addressError.classList.add('hide');   
  }
  if(mobileNumber.length !== 10 || ["5", "6", "7", "8", "9"].indexOf(mobileNumber.split('')[0]) < 0){
    mobileError.classList.remove('hide');                  
  }else{
    mobileError.classList.add('hide');            
  }
  if(rememberMobile.checked){
    // setCookie("rem",mobileNumber, 30);  
    registerationObj.rememberMe = true;  
  }
  if(uniqueCode !== '' && name !== '' && address !== '' && mobileNumber.length === 10 && ["5", "6", "7", "8", "9"].indexOf(mobileNumber.split('')[0]) > 0){
    if(userCookie.pho === mobileNumber){
      data.mobileVerificationAuthToken = userCookie.aut;
      data.deviceId = userCookie.did;

      // skip user registration and verify product directly
      console.log("User already registered! Verify product!!!!!!");
      document.querySelector('.verificationContainer').classList.replace('show','hide');
      document.querySelector('.spinnerLoader').style.display = 'block';
      verifyProduct(uniqueCode);        
    }else{
      // register user and set new cookie
      data.mobileVerificationAuthToken = '';
      data.deviceId = '';
      registerMobile(mobileNumber, uniqueCode, name);   
    }
  }
});    

// Register mobile
function registerMobile(consumerPhone, productId, name){

  registerationObj.userInfo.name = name;
  registerationObj.userInfo.phoneNumber = consumerPhone;

  var payload = registerationObj;
  console.log(payload);

  document.querySelector('.verificationContainer').classList.replace('show','hide');
  document.querySelector('.spinnerLoader').style.display = 'block';
  postData('https://app.original4sure.com/o4s/user', payload)
    .then(function(response){
      console.log(response);
      if(response.data && response.success){
        console.log('User reg successful!!');
        data.mobileVerificationAuthToken = response.data.authToken;
        data.deviceId = response.data.deviceId; 
        var cvalue = createCookieValue(consumerPhone, data.deviceId, data.mobileVerificationAuthToken);
        setCookie('rem', cvalue, 7); 
        verifyProduct(productId);        
      }
    })
    .catch(function(error){
      console.log('error: ', error);
      alert(error);
      document.querySelector('.spinnerLoader').style.display = 'none';

    })
}

// Verify Product
async function verifyProduct(productId){

  var authToken = data.mobileVerificationAuthToken;
  
  // if age or gender is not empty, post user profile
  var age = document.querySelector('.age').value;
  var gender = document.querySelector('.gender').value;
  var profilePayload = {
    profile : {}
  } 
  if(age !== ''){
    profilePayload.profile.dob = getDob(age);
  }
  if(gender !== ''){
    profilePayload.profile.sex = gender
  }
  if(age !== '' || gender !== ''){
    console.log('line 172', profilePayload);
    putData('https://app.original4sure.com/o4s/user/profile',profilePayload, authToken)
    .then(function(response){ 
      console.log(response);
    })
    .catch(async function(error){
      console.log(error);
    })
  }

  var payload = {
    "products": [
      productId
    ],
    "strategy": {
      "identifier": "PID"
    },
    "_location":{},
    "_client": "widget",
    "_platform": "web",
    "_clientVersion": "2.0.2",
    "_deviceId": data.deviceId
  }
  // if(registerationObj.userInfo.address && registerationObj.userInfo.address.city){
  //   payload['_location']['city'] = registerationObj.userInfo.address.city;
  // }else if(registerationObj.userInfo.address && registerationObj.userInfo.address.state){
  //   payload['_location']['city'] = registerationObj.userInfo.address.state;
  // }

  payload._location = registerationObj.userInfo.address;

  if (data.lat.toString().length > 1 && data.long.toString().length > 1) {
    payload.lat = data.lat
    payload.long = data.long
  }
  if (window.top.location.href.split("?")[1] && window.top.location.href.split("?")[1].indexOf("productCode") > -1) {
    var productCode = null
    var urlParams = window.top.location.href.split("?")[1].split("&")

    urlParams.forEach(function (val, key) {
      if (val.indexOf("productCode") > -1) {
        productCode = val.split("=")[1]
      }
    })
    if (null != productCode) {
      payload.inputMode = "QR"
    }
  }
  // console.log(payload);

  postData('https://app.original4sure.com/o4s/products/scanin',payload, authToken)
    .then(async function(response){ 
      console.log(response);
      if(response && response.success){
        document.querySelector('.spinnerLoader').style.display = 'none';          
        document.querySelector('.resultContainer').classList.replace('hide', 'show');
        var productState = document.querySelector('.productState');
        var productId = document.querySelector('.productId');
        var expiryDate = document.querySelector('.expiryDate');
        var productImage = document.querySelector('.productImage');
        var responseData = response.data.products[0];

        // Show message according to the code
        if(response.data.missing && response.data.missing.length > 0){
          productState.textContent = 'Invalid Code';
          document.querySelector('.statusIcon').src = "./static/img/Icons/Invalid_code.png";          
          document.querySelector('.productName').textContent = 'This is an Invalid Code!';   
          productId.textContent = 'Please verify the entered code.';
          productImage.src = './static/img/o4s_logo.png';
          return;
        }
        if (responseData.lastScan.status) {
          if(responseData.lastScan.isExpired == true){
            productState.textContent = 'Expired';
            document.querySelector('.statusIcon').src = "./static/img/Icons/Expired.png";
            document.querySelector('.invalidMessage').textContent = ''; 
          }else if (responseData.lastScan.isExpired == false){
            if ("ORIGINAL" == responseData.lastScan.status) {
              productState.textContent = 'Original Product';
              document.querySelector('.statusIcon').src = "./static/img/Icons/Original.png";
              document.querySelector('.invalidMessage').textContent = '';
            } else if ("VERIFIED" == responseData.lastScan.status) {
              productState.textContent = 'Verified Product';            
              document.querySelector('.statusIcon').src = "./static/img/Icons/verified_before.png";
              document.querySelector('.invalidMessage').textContent = '';            
            } else if ("USED" == responseData.lastScan.status) {
              productState.textContent = 'Used Product';
              document.querySelector('.statusIcon').src = "./static/img/Icons/Used.png";
              document.querySelector('.invalidMessage').textContent = '';                            
            } else if ("EXPIRY" == responseData.lastScan.status) {
              productState.textContent = 'Expired';
              document.querySelector('.statusIcon').src = "./static/img/Icons/Expired.png";
              document.querySelector('.invalidMessage').textContent = '';                            
            } else if ("DCT" == responseData.lastScan.status) {
              productState.textContent = 'Invalid';
              document.querySelector('.statusIcon').src = "./static/img/Icons/Invalid_code.png";
              document.querySelector('.invalidMessage').textContent = '';                            
            }
          } else if ("INVALID" == responseData.lastScan.status) {
            productState.textContent = 'Invalid Code';
            document.querySelector('.statusIcon').src = "./static/img/Icons/Invalid_code.png";          
            document.querySelector('.invalidMessage').textContent = 'This product is not Valid';              
          } else {
            productState.textContent = 'Unable to determine Authenticity!';
            document.querySelector('.statusIcon').src = "./static/img/Icons/Authenticity.png";          
            document.querySelector('.invalidMessage').textContent = 'Unable to determine Authenticity!';                                       
          }
        }

        // Show product id if exists
        if(responseData.idDesc  && responseData.idDesc.repr && responseData.idDesc.repr == 'alphanum'){
          productId.textContent = '';
          productId.textContent = 'Product ID: ' + responseData.idDesc.alphanum;
          productId.style.display = "block";                      
        } else if(responseData.idDesc  && responseData.idDesc.repr && responseData.idDesc.repr == 'numeric'){
          productId.textContent = '';
          productId.textContent = 'Product ID: ' + responseData.idDesc.numeric;
          productId.style.display = "block";                      
        } else if(responseData.productId ){
          productId.textContent = '';
          productId.textContent = 'Product ID: ' + responseData.productId;
          productId.style.display = "block";   
        }else{
          productId.textContent = '';
          productId.style.display = "none";            
        }
        
        // Show expiry date if exists
        if(responseData.expiry && responseData.expiry !== null && responseData.company.code === 'ITC'){
          var exp = new Date(responseData.expiry);
          exp = String(exp).split(' ');
          exp = exp[1] + ' ' + exp[3];
          expiryDate.textContent = '';
          expiryDate.textContent = 'Expiry Date: ' + String(exp);
          expiryDate.style.display = "block";                      
        }else if (responseData.expiry && responseData.expiry !== null){
          expiryDate.textContent = '';
          expiryDate.textContent = 'Expiry Date: ' + String(responseData.expiry);
          expiryDate.style.display = "block";                      
        }else{
          expiryDate.textContent = '';
          expiryDate.style.display = "none";            
        }
        
        // if(responseData.sku && responseData.sku.description && responseData.sku.description.length > 0){
        //   document.querySelector('.productDescription').style.display = 'block';
        //   document.querySelector('.prodDesc').textContent = responseData.sku.description;
        // }else{
        //   document.querySelector('.productDescription').style.display = 'none';
        // }
 
        // Show aashirvaad link if ITC company code
        if(responseData.company.code === 'ITC'){
          var responseTemplate = await getTemplate(responseData.company.code,responseData.sku.code);
          var templateBody = await responseTemplate.text();

          document.querySelector('#renderTemplate').innerHTML = templateBody;
          document.querySelector('#hidden-hr').style.display = 'block';
          var brandLink = document.querySelectorAll('.brandName');
          brandLink.forEach(function(val) {
            val.href =  'https://www.aashirvaad.com/whole-wheat-atta.aspx';
          })
        }else if (responseData.productInfo && responseData.productInfo.brand && responseData.productInfo.brand.brandSiteUrl) {
          document.querySelector('.brandName').href = responseData.productInfo.brand.brandSiteUrl ;
        } else{
          // document.querySelector('#itc-body-extra').style.display = 'none';
          document.querySelector('#hidden-hr').style.display = 'none';
          // document.querySelector('.btnBrand').style.display = "none";
        }

        // Show product image if exists
        if(responseData.sku && responseData.sku.images && responseData.sku.images.medium){
          productImage.src = responseData.sku.images.medium;
        }
        // } else if(responseData.sku && responseData.sku.brand && responseData.sku.brand.brandLogoUrl){
        //   productImage.src = responseData.sku.brand.brandLogoUrl;
        // } else {
        //   productImage.src = './static/img/o4s_logo.png';
        // }
         
        // Show product name
        var productName = document.querySelector('.productName');
        if(responseData.sku && responseData.sku.name){
          productName.textContent = responseData.sku.name;
        } 
        // else {
        //   productName.textContent = "No Product Found";            
        // }


        // fallback if name and sku images are not present
        if(!responseData.sku.name || !responseData.sku.images){
          var companyCode = responseData.company.code;
          var skuCode = responseData.productDetails.skuCode;
          fetchSkuData(skuCode, companyCode);
        }
      }
      else{
        alert('Failed to verify product! Please try again!');
        document.querySelector('.spinnerLoader').style.display = 'none';
        verifyAnotherProduct();
      }
    })
    .catch(function(error){
      console.log('error: ',error);
    })
}    

// check url for productCode
function checkUrl() {
  if (window.top.location.href.split("?")[1] && window.top.location.href.split("?")[1].indexOf("productCode") > -1) {

    var productCode = null
    var urlParams = window.top.location.href.split("?")[1].split("&")

    urlParams.forEach(function (val, key) {
      if (val.indexOf("productCode") > -1) {
        productCode = val.split("=")[1]
      }
    })

    if (null != productCode) {
      document.querySelector('.uniqueCode').value = productCode ; 
      document.querySelector('.verificationSubmit').click();
    }

  }
}

// Reset fields to verify another product
function verifyAnotherProduct(){
  // clear input fields
  document.querySelector('.uniqueCode').value = '';
  document.querySelector('.mobileNumber').value = '';
  document.querySelector('.name').value = '';
  document.querySelector('.age').value = '';
  document.querySelector('.gender').value = '';
  document.querySelector('.address').value = '';
  // document.querySelector('#itc-body-extra').style.display = 'none';
  document.querySelector('.productState').value = '';
  document.querySelector('.productName').value = '';
  document.querySelector('.productId').value = '';
  document.querySelector('.expiryDate').value = '';
  document.querySelector('.productImage').value = '';
  document.querySelector('#hidden-hr').style.display = 'none';
  document.querySelector('.brandName').href = 'https://www.original4sure.com/' ;
  // clear data object
  data.productCode = "";
  data.authenticationId = "";
  
  console.log(data);
  document.querySelector('.verificationContainer').classList.replace('hide', 'show');
  document.querySelector('.resultContainer').classList.replace('show','hide');
}

// Function postData
function postData(url, payload, authToken) {
  return fetch(url, {
    body: JSON.stringify(payload), 
    cache: 'no-cache', 
    credentials: 'same-origin', 
    headers: {
      'content-type': 'application/json',
      'authToken' : authToken
    },
    method: 'POST', 
    mode: 'cors', 
  })
  .then(function(response){
    return response.json();
  })
}

// Function putData
function putData(url, payload, authToken) {
  return fetch(url, {
    body: JSON.stringify(payload), 
    cache: 'no-cache', 
    credentials: 'same-origin', 
    headers: {
      'content-type': 'application/json',
      'authToken' : authToken
    },
    method: 'PUT', 
    mode: 'cors', 
  })
  .then(function(response){
    return response.json();
  })
}


document.querySelector('.resetVerifyBtn').addEventListener('click',verifyAnotherProduct);

// Set cookie
function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
  var expires = "expires="+d.toGMTString();
  document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  return true;
}

// get Cookie
function getCookie(cname) {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(';');
  for(var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
          c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
          return c.substring(name.length, c.length);
      }
  }
  return "";
}

// Check cookie
function checkCookie() {
  var user=getCookie("rem");
  if (user != "") {
    user = JSON.parse(decodeURIComponent(user));
    document.querySelector('.mobileNumber').value = user.pho;
  } else {
    
    if (user != "" && user != null) {
    var consumerPhone = document.querySelector('.mobileNumber').value;
    setCookie("rem",consumerPhone, 30);
    }
  }
}


function parseAddress(address){

  var locationObj = {
    country: '',
    state: '',
    city: '',
    district: '',
    pincode: '',
    address: { 
      line1: '',
      line2: '' 
    },
    latitude: '',
    longitude: '',
   }

   console.log(address)
  var addressLocation = address.geometry.location;
  var addressComponents = address.address_components;
  
  
  if(typeof (addressLocation.lat) === 'function' && typeof (addressLocation.lat) === 'function'){
    locationObj.latitude = addressLocation.lat();
    locationObj.longitude = addressLocation.lng();  
  }else{
    locationObj.latitude = addressLocation.lat;
    locationObj.longitude = addressLocation.lng;  
  }

  addressComponents.forEach( (addressComponent) => {
    if(addressComponent.types[0] === 'country'){
      locationObj.country = addressComponent.long_name;
    }
    if(addressComponent.types[0] === 'administrative_area_level_1'){
      locationObj.state = addressComponent.long_name;
    }
    if(addressComponent.types[0] === 'administrative_area_level_2'){
      locationObj.district = addressComponent.long_name;
    }
    if(addressComponent.types[0] === 'locality'){
      locationObj.city = addressComponent.long_name;
    }
    if(addressComponent.types[0] === 'sublocality_level_1'){
      locationObj.address.line1 = addressComponent.long_name;
    }
    if(addressComponent.types[0] === 'postal_code'){
      locationObj.pincode = addressComponent.long_name;
    }
  })
  return locationObj;
}

// temp function to set cookie on client side against a mobile number
function createCookieValue(pho, did, aut){
  var cvalue = {
    pho : pho,
    did : did,
    aut : aut
  }
  return (encodeURIComponent(JSON.stringify(cvalue)));
}

// fetch sku details as a fallback
function fetchSkuData(skuCode,companyCode){
  let url = 'https://app.original4sure.com/o4s/sku?skuCode=' + skuCode + '&companyCode=' + companyCode;
  fetch(url,
    {
      method: 'GET',    
      contentType: 'application/x-www-form-urlencoded',
      headers: {
        authToken : data.mobileVerificationAuthToken
      }
    })
      .then(function(response){
        return response.json()
      })
      .then(function(response){
        if(response && response.success){
          if(response.data && response.data.name){
            console.log('fallback name')
            document.querySelector('.productName').textContent = response.data.name;
          }else{
            document.querySelector('.productName').textContent = "No Product Found!";  
          }

          if(response.data && response.data.images && response.data.images.medium){
            console.log('fallback image')
            document.querySelector('.productImage').src = response.data.images.medium;
          }else{
            document.querySelector('.productImage').src = './static/img/o4s_logo.png';
          }
        }
      })
      .catch(function(error){
        console.log(error);
      })
}

// fetch test template file 
const getTemplate = (companyCode,skuCode) => {
  return fetch(`../../templates/${companyCode}/${skuCode}.html`) 
} 


// conver age to dob
function getDob(age){
  var today = new Date();
  var dd = today.getDate();
  var mm = today.getMonth()+1; //January is 0!
  var yyyy = today.getFullYear() - age;

  if(dd<10) {
      dd = '0'+dd
  } 

  if(mm<10) {
      mm = '0'+mm
  } 

  today = yyyy + '-' +  mm + '-' + dd ;
  
  var dob = (new Date(today)).getTime()/1000;
  console.log(dob);
  return dob;
}
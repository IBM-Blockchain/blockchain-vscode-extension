// Grammar for parsing of the Fabric Endorsment Policies
//
// Defined in the documentation at
// https://hyperledger-fabric.readthedocs.io/en/latest/endorsement-policies.html#endorsement-policy-syntax
// The expression will be an operator with arguments, each of the arguments can be an expression
// The OutOf operator is a bit different as that demands the first agument be a number
Expression
   =  op:Operator '(' _ args:Some_Expression_Args _ ')'
      {
         return {op,args}
      }
   / 'OutOf' '(' _ i:Integer _ ',' _ args:Some_Expression_Args _ ')'
       {
        if ( i > args.length + 1 ) expected('OutOf count is too large')
        return {op:'OutOf', count:i, args}
       }
// The expression arguments can either be principal or expression
Expression_Arg = Expression / Principal
// Support for comma seperated list of expression arguments
Some_Expression_Args
   = a:Expression_Arg _ ',' _ s:Some_Expression_Args { return [a].concat(s) }
   / e:Expression_Arg { return [e] }
// Principal is the mspid and the role contained within single quoates
Principal = "'" m:mspid_and_role "'" { return m  }
// The mspid is either
//    one msp_element, then .  then the Role
// Or one msp_element, then .  but NOT the Role, then followed by the mspid (and repeat)
mspid_and_role
   = a:mspid_element '.' b:Role {return { mspid:a.join(""), role:b } }
   / c:mspid_element '.' !Role d:mspid_and_role { return { mspid:c.join("") +"." + d.mspid, role:d.role}  }
// A single part of the mspid is the alphanumeric characters
mspid_element = [-a-zA-Z0-9]+
// The two basic boolean operators
Operator = 'AND' / 'OR'
// comma separated list of roles
Role = 'member' / 'admin' / 'client' / 'peer' / 'orderer'
// A number for the OutOf(x, .. , ..) case
Integer "integer"
  = digits:[0-9']+ {
  var digitString = digits.join("")
  if(digitString.startsWith("'")) digitString = digitString.substring(1, digitString.length)
  if(digitString.endsWith("'")) digitString = digitString.substring(0, digitString.length -1)
  return parseInt(digitString, 10);
  }
// Whitepsace definition, set to just return as we're not worried about it later
_ "whitespace"
  = [ \t\n\r]* { return }

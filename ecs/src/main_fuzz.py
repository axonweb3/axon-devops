import json

from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.acs_exception.exceptions import ClientException
from aliyunsdkcore.acs_exception.exceptions import ServerException
from aliyunsdkecs.request.v20140526 import DescribeInstancesRequest
from aliyunsdkecs.request.v20140526 import StopInstanceRequest
from aliyunsdkecs.request.v20140526 import CreateInstanceRequest
from aliyunsdkecs.request.v20140526 import DescribeImageSupportInstanceTypesRequest
from aliyunsdkecs.request.v20140526 import DescribeImagesRequest
from aliyunsdkecs.request.v20140526 import CreateSecurityGroupRequest
from aliyunsdkecs.request.v20140526 import AuthorizeSecurityGroupRequest
from aliyunsdkecs.request.v20140526 import StartInstanceRequest
from aliyunsdkecs.request.v20140526 import DescribeInstancesRequest
from aliyunsdkecs.request.v20140526 import DeleteSecurityGroupRequest
from aliyunsdkecs.request.v20140526 import StopInstanceRequest
from aliyunsdkecs.request.v20140526 import DeleteInstanceRequest

import acdb
import conf

client = AcsClient(
    conf.secret["aliyun"]["access_key"],
    conf.secret["aliyun"]["access_secret"],
    "cn-hangzhou",
)

# request = StartInstanceRequest.StartInstanceRequest()
# request.set_accept_format("json")
# request.set_InstanceId("i-bp10ewimh9xnssrznrzk")
# response = json.loads(client.do_action_with_exception(request))
# print(response)

# request = DescribeInstancesRequest.DescribeInstancesRequest()
# request.set_accept_format("json")
# request.set_InstanceIds(["i-bp10ewimh9xnssrznrzk"])
# # https://api.aliyun.com/?spm=a2c63.p38356.879954.7.696b5446tPK4BA#/?product=Ecs&version=2014-05-26&api=DescribeInstances&params={}&tab=DOC&lang=PYTHON
# response = json.loads(client.do_action_with_exception(request))
# print(response)


instance_id = "i-bp19a8519y3csy851bt7"

client = AcsClient(
    conf.secret["aliyun"]["access_key"],
    conf.secret["aliyun"]["access_secret"],
    "cn-hangzhou",
)

# request = StopInstanceRequest.StopInstanceRequest()
# request.set_accept_format('json')
# request.set_InstanceId(instance_id)
# response = client.do_action_with_exception(request)
# print(response)

# request = DeleteInstanceRequest.DeleteInstanceRequest()
# request.set_accept_format('json')
# request.set_InstanceId(instance_id)
# response = client.do_action_with_exception(request)
# print(response)

# request = DescribeInstancesRequest.DescribeInstancesRequest()
# request.set_accept_format("json")
# request.set_InstanceIds([instance_id])
# response = json.loads(client.do_action_with_exception(request))
# print(response)

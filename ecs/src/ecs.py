import copy
import json
import time

from aliyunsdkcore.client import AcsClient
from aliyunsdkcore.acs_exception.exceptions import ClientException
from aliyunsdkcore.acs_exception.exceptions import ServerException
from aliyunsdkecs.request.v20140526.ImportKeyPairRequest import ImportKeyPairRequest
from aliyunsdkecs.request.v20140526.CreateSecurityGroupRequest import CreateSecurityGroupRequest
from aliyunsdkecs.request.v20140526.AuthorizeSecurityGroupRequest import AuthorizeSecurityGroupRequest
from aliyunsdkecs.request.v20140526.DescribeImagesRequest import DescribeImagesRequest
from aliyunsdkecs.request.v20140526.CreateInstanceRequest import CreateInstanceRequest
from aliyunsdkecs.request.v20140526.AllocatePublicIpAddressRequest import AllocatePublicIpAddressRequest
from aliyunsdkecs.request.v20140526.StartInstanceRequest import StartInstanceRequest
from aliyunsdkecs.request.v20140526.DescribeInstancesRequest import DescribeInstancesRequest
from aliyunsdkecs.request.v20140526.StopInstanceRequest import StopInstanceRequest
from aliyunsdkecs.request.v20140526.DescribeInstancesRequest import DescribeInstancesRequest
from aliyunsdkecs.request.v20140526.DeleteInstanceRequest import DeleteInstanceRequest

import conf
import acdb


c_region_id_list = [
    "cn-qingdao",
    "cn-beijing",
    "cn-zhangjiakou",
    "cn-huhehaote",
    "cn-hangzhou",
    "cn-shanghai",
    "cn-shenzhen",
]
c_keypair_name = "muta"
c_system_disk_size = 120


def init():
    security_group_dict = {}
    for region_id in c_region_id_list:
        client = AcsClient(
            conf.secret["aliyun"]["access_key"],
            conf.secret["aliyun"]["access_secret"],
            region_id,
        )
        # Import keypair
        with open(conf.secret["aliyun"]["private_key"]) as f:
            data = f.read()
        req = ImportKeyPairRequest()
        req.set_accept_format("json")
        req.set_KeyPairName(c_keypair_name)
        req.set_PublicKeyBody(data)
        res = json.loads(client.do_action_with_exception(req))
        print("Import keypair", res)

        # Create security group
        req = CreateSecurityGroupRequest()
        req.set_accept_format("json")
        res = json.loads(client.do_action_with_exception(req))
        security_group_id = res["SecurityGroupId"]

        security_group_dict[region_id] = security_group_id
        print("Create security group", security_group_id)
        acdb.db.save("security_group_dict", security_group_dict)

        # Config port range
        req = AuthorizeSecurityGroupRequest()
        req.set_accept_format("json")
        req.set_SecurityGroupId(security_group_id)
        req.set_IpProtocol("all")
        req.set_PortRange("-1/-1")
        req.set_SourceCidrIp("0.0.0.0/0")
        res = json.loads(client.do_action_with_exception(req))
        print("Config port range", res)


def info(region_instance_id_list):
    # Arg region_instance_id_list [[region_id, instance_id], [region_id, instance_id]...]
    # Return [Info, Info...]
    info_list = []
    for (region_id, instance_id) in region_instance_id_list:
        client = AcsClient(
            conf.secret["aliyun"]["access_key"],
            conf.secret["aliyun"]["access_secret"],
            region_id,
        )
        req = DescribeInstancesRequest()
        req.set_accept_format("json")
        req.set_InstanceIds([instance_id])
        res = json.loads(client.do_action_with_exception(req))
        info_list.append(res["Instances"]["Instance"][0])
    return info_list


def make():
    security_group_dict = acdb.db.load("security_group_dict")  # map[region_id]security_group_id
    region_instance_id_list = []
    for node_conf in conf.config["ecs"]["node"]:
        print("Get request", node_conf)
        client = AcsClient(
            conf.secret["aliyun"]["access_key"],
            conf.secret["aliyun"]["access_secret"],
            node_conf["region_id"],
        )

        # Check image id is avaliable
        req = DescribeImagesRequest()
        req.set_Status("Available")
        req.set_ImageOwnerAlias("system")
        req.set_InstanceType(node_conf["instance_type"])
        req.set_OSType("linux")
        req.set_PageSize(100)
        req.set_ActionType("CreateEcs")
        res = json.loads(client.do_action_with_exception(req))
        all_avaliable_image = [e["ImageId"] for e in res["Images"]["Image"]]
        assert node_conf["image"] in all_avaliable_image

        # Create ECS instance
        req = CreateInstanceRequest()
        req.set_ImageId(node_conf["image"])
        req.set_SecurityGroupId(security_group_dict[node_conf["region_id"]])
        req.set_Password(conf.secret["aliyun"]["ecs_password"])
        req.set_InstanceChargeType("PostPaid")
        req.set_SystemDiskCategory("cloud_efficiency")
        req.set_SystemDiskSize(c_system_disk_size)
        req.set_InstanceType(node_conf["instance_type"])
        req.set_InternetMaxBandwidthOut(node_conf["internet_max_bandwidth_out"])
        req.set_KeyPairName(c_keypair_name)
        res = json.loads(client.do_action_with_exception(req))
        instance_id = res["InstanceId"]
        print("Create", node_conf["region_id"], instance_id)
        region_instance_id_list.append([node_conf["region_id"], instance_id])

    print("Wait")
    for _ in range(1 << 32):
        if sum([e["Status"] == "Stopped" for e in info(region_instance_id_list)]) == len(region_instance_id_list):
            break

    for (region_id, instance_id) in region_instance_id_list:
        client = AcsClient(
            conf.secret["aliyun"]["access_key"],
            conf.secret["aliyun"]["access_secret"],
            region_id,
        )
        # Allocate public ip address
        req = AllocatePublicIpAddressRequest()
        req.set_accept_format("json")
        req.set_InstanceId(instance_id)
        client.do_action_with_exception(req)
        print("Allocate public ip address", region_id, instance_id)

        # Start ECS instance
        req = StartInstanceRequest()
        req.set_accept_format("json")
        req.set_InstanceId(instance_id)
        res = json.loads(client.do_action_with_exception(req))
        print("Start", region_id, instance_id)

    print("Wait")
    for _ in range(1 << 32):
        if sum([e["Status"] == "Running" for e in info(region_instance_id_list)]) == len(region_instance_id_list):
            break

    # Get ECS info
    acdb.db.save("instance_list", info(region_instance_id_list))
    print("Instance info saved at ./res/db/instance_list.json")


def free():
    instance_list = acdb.db.load_or("instance_list", [])
    region_instance_id_list = [[e["RegionId"], e["InstanceId"]] for e in instance_list]

    # Stop ECS instance
    for (region_id, instance_id) in region_instance_id_list:
        client = AcsClient(
            conf.secret["aliyun"]["access_key"],
            conf.secret["aliyun"]["access_secret"],
            region_id,
        )
        req = StopInstanceRequest()
        req.set_accept_format("json")
        req.set_InstanceId(instance_id)
        client.do_action_with_exception(req)
        print("Stop", region_id, instance_id)

    print("Wait")
    for _ in range(1 << 32):
        if sum([e["Status"] == "Stopped" for e in info(region_instance_id_list)]) == len(region_instance_id_list):
            break
    time.sleep(30)

    # Delete ECS instance
    for (region_id, instance_id) in region_instance_id_list:
        client = AcsClient(
            conf.secret["aliyun"]["access_key"],
            conf.secret["aliyun"]["access_secret"],
            region_id,
        )
        req = DeleteInstanceRequest()
        req.set_accept_format("json")
        req.set_InstanceId(instance_id)
        client.do_action_with_exception(req)
        print("Delete", instance_id)
    acdb.db.save("instance_list", [])

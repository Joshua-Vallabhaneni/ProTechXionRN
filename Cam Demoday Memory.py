import cv2
import numpy as np
from ultralytics import YOLO
from tqdm import tqdm 
import sys
from yolox.tracker.byte_tracker import BYTETracker
import tensorflow as tf
import time
import os
import time
import random
import base64
from PIL import Image
import io
import threading
from firebase_config_backend import add_document, get_latest_document
from concurrent.futures import ThreadPoolExecutor
from firebase_config_backend import COLLECTIONS, FIREBASE_DB_URL
import requests
import shutil


_executor = ThreadPoolExecutor(max_workers=2)

# tf.config.set_visible_devices([], 'GPU')  # Force CPU execution
# print("Using only CPU for execution")

gun_time = 0.0
YOLO_time = 0.0

COLOR_BLUE =    (255, 0, 0) 
COLOR_GREEN =   (0, 255, 0) 
COLOR_RED =     (0, 0, 255) 
COLOR_YELLOW =  (255, 255, 50)
COLOR_PURPLE =  (150, 50, 255)
COLOR_CIAN =    (50, 255, 255)

VOID_CONST = 0
INF_CONST = 1000000000

## tunable params

MAX_MEMORY = 110 ## frames of memory

DISPLAY_TRACKS = True  #green or red (shooter)
DISPLAY_COM = True #green or red (shooter)
DRAW_GUN_BBOX = True  #purple
DISPLAY_PEOPLE_BOXES = False #cian and yellow  #TODO see why it does not always match track bbox
DISPLAY_ROIS = True #blue

FRAME_DURATION =  19200 # -1 for full video
FRAME_SKIP = 18500
GUN_DETECTION_FRAME_START = 0   

WEAPON_CONF = 0.817
PEOPLE_CONF = 0.6
TRACK_MATCH_DISTANCE = 0.5
MEMORY_ALLOWED_DISTANCE = 2.5

ROI_WIDTH = 0.5

BBOX_EXTENSION_FOR_WPN_ASSOC = 0.2

NUM_CAMERAS = 5

IGNORED_FRAMES = 0
FRAMES_PER_ITER = IGNORED_FRAMES + 1

# RESET_FRAME_NUMBERS = [
#     0,
#     7825,
#     12721,
#     15456,
#     16687,
#     22417,
#     25195
# ]
RESET_FRAME_NUMBERS = [
    0,
    INF_CONST
]
NUMBER_OF_RESETS = len(RESET_FRAME_NUMBERS)

DYNAMIC_THR_FRAME_NUMBERS = [
    3*0,
    3*1450,
    3*2200,
    3*2260,
    3*3035,
    3*3240,
    3*3830,
    3*4040,
    3*4490,
    3*4780,
    3*5140,
    3*6020,
    3*7000,
    3*7160,
    3*7800,
    3*8200,
    INF_CONST
]

DYNAMIC_THR = [
    1.0,
    0.7,
    0.3,
    1.0,
    0.5,
    1.0,
    0.7,
    0.6,
    1.0,
    0.5,
    1.0,
    0.7,
    0.5,
    1.0,
    0.6,
    1.0,
    1.0
]

# DYNAMIC_THR_FRAME_NUMBERS = [
#     0,
#     7825,
#     12721,
#     15456,
#     16687,
#     22417,
#     25195
# ]

# DYNAMIC_THR = [
#     0.7,
#     0.7,
#     0.7,
#     0.7,
#     0.7,
#     0.7,
#     0.7
# ]
# -------------------Weapon detection functions--------------------
def clear_collection(collection):
    """Clear all entries in a specific collection"""
    try:
        print(f"Clearing all entries in {collection}...")
        url = f"{FIREBASE_DB_URL}/{collection}.json"
        response = requests.delete(url)
        response.raise_for_status()  # Raise an exception for HTTP errors
        print(f"Successfully cleared all entries in {collection}")
    except Exception as error:
        print(f"Error clearing entries in {collection}: {error}")

def clear_all_collections():
    """Clear all entries in all collections"""
    print("Starting database cleanup...")
    
    # Clear each collection
    clear_collection(COLLECTIONS.SHOOTER_IMAGE)
    clear_collection(COLLECTIONS.SHOOTER_VERIFICATION)
    clear_collection(COLLECTIONS.SHOOTER_COORDINATES)
    
    print("Database cleanup complete! All collections have been cleared.")
    print("You can now start testing with a fresh database.")

def format_boxes(bboxes, image_height, image_width):
    for box in bboxes:
        ymin = int(box[0] * image_height)
        xmin = int(box[1] * image_width)
        ymax = int(box[2] * image_height)
        xmax = int(box[3] * image_width)
        box[0], box[1], box[2], box[3] = xmin, ymin, xmax, ymax
    return bboxes

def draw_bbox(image, bboxes, dynamic_weapon_conf, show_label=True, allowed_classes=""):
    classes = allowed_classes
    num_classes = len(classes)
    image_h, image_w, _ = image.shape
    out_boxes, out_scores, out_classes, num_boxes = bboxes
    bbox_color = COLOR_PURPLE

    for i in range(num_boxes):
        if int(out_classes[i]) < 0 or int(out_classes[i]) > num_classes: 
            print("ERROR")
            continue
        box_xyxy = out_boxes[i]
        fontScale = 0.5
        score = out_scores[i]
        if score < dynamic_weapon_conf:
            continue
        class_ind = int(out_classes[i])
        class_name = classes[class_ind]
        if class_name not in allowed_classes:
            continue
        else:
            bbox_thick = int(0.6 * (image_h + image_w) / 600)
            c1, c2 =  (int(box_xyxy[0]), int(box_xyxy[1])), (int(box_xyxy[2]), int(box_xyxy[3]))
            cv2.rectangle(image, c1, c2, bbox_color, bbox_thick)

            if show_label:
                # bbox_mess = '%s: %.2f' % (class_name, score)
                bbox_mess = '%s' % (class_name)
                t_size = cv2.getTextSize(bbox_mess, 0, fontScale, thickness=bbox_thick // 2)[0]
                c3 = (c1[0] + t_size[0], c1[1] - t_size[1] - 3)
                cv2.rectangle(image, c1, (int(c3[0]), int(c3[1])), bbox_color, -1) #filled
                cv2.putText(image, bbox_mess, (c1[0], int(np.float32(c1[1] - 2))), cv2.FONT_HERSHEY_SIMPLEX,fontScale, 
                            (0, 0, 0), bbox_thick // 2, lineType=cv2.LINE_AA)

def find_weapons_relative(annotated_frame, patch):
    crop, roi = patch
    image = cv2.resize(crop, (608, 608))
    # cv2.imwrite("model_input.jpg", image)
    image = image / 255.
    image = image.astype(np.float32)
    image = cv2.cvtColor(image,cv2.COLOR_BGR2RGB)
    image = np.expand_dims(image, axis=0).astype(np.float32)

    x1, y1, _, _ = roi
    
    batch_data = tf.constant(image)
    pred_bbox = infer_weapon(batch_data)
    for key, value in pred_bbox.items():
        boxes = value[:, :, 0:4]
        pred_conf = value[:, :, 4:] #TODO fix this it overwrites

    boxes, scores, classes, valid_detections_number = tf.image.combined_non_max_suppression(
    boxes=tf.reshape(boxes, (tf.shape(boxes)[0], -1, 1, 4)),
    scores=tf.reshape(
        pred_conf, (tf.shape(pred_conf)[0], -1, tf.shape(pred_conf)[-1])),
    max_output_size_per_class=50,
    max_total_size=50,
    iou_threshold=0.5,
    score_threshold=0.1
    )
    original_h, original_w, _ = crop.shape
    bboxes = format_boxes(boxes.numpy()[0], original_h, original_w)
    pred_bbox = [bboxes, scores.numpy()[0], classes.numpy()[0], valid_detections_number.numpy()[0]]
    #full image coordinates
    for box in pred_bbox[0]:
        box[0] += x1  
        box[2] += x1  
        box[1] += y1  
        box[3] += y1  
    if DRAW_GUN_BBOX:
        draw_bbox(annotated_frame, pred_bbox, dynamic_weapon_conf, show_label=True, allowed_classes=allowed_classes)
    return pred_bbox

def send_coordinates(x, y):
    
    try:
        # Generate random coordinates
        coordinates =      {
            'x': x,  
            'y': y,  
            'timestamp': int(time.time() * 1000)  # Current time in milliseconds
        }
        
        # Save to database using Firebase
        _executor.submit(add_document, COLLECTIONS.SHOOTER_COORDINATES, coordinates)
        
        # print(f"Coordinates sent: X={coordinates['x']}, Y={coordinates['y']}")
        return
    
    except Exception as error:
        print(f"Error sending coordinates: {error}")
        return None
    
def send_coordinates_past(x, y):
    
    try:
        # Generate random coordinates
        coordinates =      {
            'x': x,  
            'y': y,  
            'timestamp': int(time.time() * 1000)  # Current time in milliseconds
        }
        
        # Save to database using Firebase
        _executor.submit(add_document, COLLECTIONS.LAST_DETECTED_LOCATION, coordinates)
        
        # print(f"Coordinates sent: X={coordinates['x']}, Y={coordinates['y']}")
        return
    
    except Exception as error:
        print(f"Error sending coordinates: {error}")
        return None

def send_shooter_image_artur(image):
    try:

        success, buffer = cv2.imencode('.png', image)
        if not success:
            raise RuntimeError("Could not encode image to PNG") 
        
        base64_data = base64.b64encode(buffer).decode('utf-8')
        
        print(f"[DEBUG] Image data size: {len(base64_data)} characters")
        print(f"[DEBUG] First 50 chars of base64: {base64_data[:50]}...")
        
        # Create a data URI format that the app expects
        # The app is expecting a data URI format like 'data:image/png;base64,...'
        # but we're just sending the raw base64 data
        
        # Save to database using Firebase
        image_doc = add_document(COLLECTIONS.SHOOTER_IMAGE, {
            'base64Data': base64_data,
            'timestamp': int(time.time() * 1000)
        })
        
        print(f"Shooter image sent to database. ID: {image_doc['id']}")
        return image_doc['id']
    
    except Exception as error:
        print(f"Error sending shooter image: {error}")
    return None

# -------------------Homography part--------------------
def find_real_coords(x, y, video_num, H_list):
    H = H_list[video_num]
    pixel_coords = np.array([x, y, 1.0], dtype=np.float32)
    world_hom = H @ pixel_coords
    w = world_hom[2]
    if np.abs(w) < 1e-9:
        print("Warning: w is zero or extremely small, cannot project to 2D.")
        return 0, 0

    X_world = world_hom[0] / w
    Y_world = world_hom[1] / w
    return X_world, Y_world

#video points for homography
image_points_1 = np.array([
    [548, 465],
    [582, 427],
    [613, 395],
    [662, 482],
    [684, 438],
    [702, 405],
    [780, 496],
    [790, 449],
    [797, 415]
], dtype=np.float32)
#good
image_points_2 = np.array([
    [430, 537],
    [374, 494],
    [328, 458],
    [547, 515],
    [483, 479],
    [431, 448],
    [644, 499],
    [572, 466],
    [514, 441]
], dtype=np.float32)
world_points_2 = np.array([
    [0, -25.666],
    [1, -25.666],
    [2, -25.666],
    [0, -26.666],
    [1, -26.666],
    [2, -26.666],
    [0, -27.666],
    [1, -27.666],
    [2, -27.666]
], dtype=np.float32)

#good
image_points_3 = np.array([
    [548, 465],
    [582, 427],
    [613, 395],
    [662, 482],
    [684, 438],
    [702, 405],
    [780, 496],
    [790, 449],
    [797, 415]
], dtype=np.float32)
# world_points_3 = np.array([
#     [0, 12.7666],
#     [0, 13.7666],
#     [0, 14.7666],
#     [1, 12.7666],
#     [1, 12.7666],
#     [1, 14.7666],
#     [2, 12.7666],
#     [2, 13.7666],
#     [2, 14.7666]
# ], dtype=np.float32)
world_points_3 = np.array([
    [0, 10],
    [0, 11],
    [0, 12],
    [1, 10],
    [1, 11],
    [1, 12],
    [2, 10],
    [2, 11],
    [2, 12]
], dtype=np.float32)

#good
image_points_4 = np.array([
    [416, 651],
    [466, 548],
    [506, 469],
    [588, 672],
    [615, 559],
    [638, 477],
    [770, 686],
    [764, 572],
    [758, 484]
], dtype=np.float32)
world_points_4 = np.array([
    [-1.333, -2],
    [-1.333, -3],
    [-1.333, -4],
    [-2.333, -2],
    [-2.333, -3],
    [-2.333, -4],
    [-3.333, -2],
    [-3.333, -3],
    [-3.333, -4]
], dtype=np.float32)
#good
image_points_5 = np.array([
    [489, 639],
    [488, 528],
    [489, 447],
    [665, 623],
    [636, 518],
    [620, 442],
    [829, 604],
    [777, 507],
    [740, 433]
], dtype=np.float32)
# world_points_5 = np.array([
#     [-3.333, 5.3333],
#     [-3.333, 6.3333],
#     [-3.333, 7.3333],
#     [-2.333, 5.3333],
#     [-2.333, 6.3333],
#     [-2.333, 7.3333],
#     [-1.333, 5.3333],
#     [-1.333, 6.3333],
#     [-1.333, 7.3333]
# ], dtype=np.float32)
world_points_5 = np.array([
    [-3.333, 1],
    [-3.333, 2],
    [-3.333, 3],
    [-2.333, 1],
    [-2.333, 2],
    [-2.333, 3],
    [-1.333, 1],
    [-1.333, 2],
    [-1.333, 3]
], dtype=np.float32)
#good
image_points_6 = np.array([
    [725, 455],
    [859, 447],
    [976, 439],
    [748, 535],
    [905, 523],
    [1035, 508],
    [783, 647],
    [963, 627],
    [1108, 598]
], dtype=np.float32)
world_points_6 = np.array([
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2]
], dtype=np.float32)

## check
image_points_t1 = np.array([
    [477, 687],
    [488, 577],
    [497, 499],
    [666, 675],
    [647, 566],
    [633, 489],
    [847, 650],
    [802, 552],
    [763, 478]
], dtype=np.float32)
world_points_t1= np.array([
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2]
], dtype=np.float32)
##Check 
image_points_t2 = np.array([
    [717, 372],
    [858, 382],
    [987, 390],
    [709, 452],
    [876, 465],
    [1024, 472],
    [698, 568],
    [895, 582],
    [1071, 583]
], dtype=np.float32)
world_points_t2 = np.array([
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 0],
    [1, 1],
    [1, 2],
    [2, 0],
    [2, 1],
    [2, 2]
], dtype=np.float32)


H_list = [None] * NUM_CAMERAS
H_list[0], mask1 = cv2.findHomography(image_points_2, world_points_2, cv2.RANSAC)
H_list[1], mask1 = cv2.findHomography(image_points_3, world_points_3, cv2.RANSAC)
H_list[2], mask1 = cv2.findHomography(image_points_4, world_points_4, cv2.RANSAC)
H_list[3], mask1 = cv2.findHomography(image_points_5, world_points_5, cv2.RANSAC)
H_list[4], mask1 = cv2.findHomography(image_points_6, world_points_6, cv2.RANSAC)

# H_list[5], mask1 = cv2.findHomography(image_points_1, world_points_1, cv2.RANSAC)

#--------------------define tracker--------------------
class TrackArgs:
    track_thresh = 0.5
    # high_thresh = 0.5
    # new_track_thresh = 0.6
    match_thresh = 0.8
    track_buffer = 30
    mot20 = False  # or True if needed

bytetrack_args = TrackArgs()

trackers = [BYTETracker(bytetrack_args, frame_rate=(30/FRAMES_PER_ITER)) for _ in range(NUM_CAMERAS)] 

#-------------------- initialize gun detection model ----------------------

path="Models"
iterateai_model = tf.saved_model.load(path)
infer_weapon = iterateai_model.signatures['serving_default']
allowed_classes = ["Gun","Rifle"]#["Gun","Knife","Rifle"]

#--------------------Pose estimation part--------------------
model = YOLO("yolo11l-pose.pt")

video_names = [ 'camera_2_synced',
                'camera_3_synced',
                'camera_4_synced',
                'camera_5_synced',
                'camera_6_synced']
# video_names = ['Second_sess_1_sync_cut', 'Second_sess_2_sync_cut']

number_of_videos = len(video_names)

caps = []
frame_widths = []
frame_heights = []
fpss = []
frame_counts = []
fourccs = []
outs = []

output_dir = "output_videos"

if os.path.exists(output_dir):
    shutil.rmtree(output_dir)  

os.makedirs(output_dir)  

for name in video_names:
    video_path = os.path.join("synced_videos", f"{name}.mp4")
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print(f"Warning: Could not open video file videos/{name}.mp4")
        continue  # Skip to next video

    caps.append(cap)
    
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))

    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    
    frame_widths.append(width)
    frame_heights.append(height)
    fpss.append(fps)
    frame_counts.append(frame_count)
    
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    fourccs.append(fourcc)
    
    out_path = os.path.join(output_dir, f"{name}_position_estimation.mp4")
    out = cv2.VideoWriter(out_path, fourcc, fps, (width, height))
    outs.append(out)


#collage out
target_size = (480, 270)  # Resize all frames to this size (W x H)
cols, rows = 3, 2
collage_width = cols * target_size[0]
collage_height = rows * target_size[1]
fps = 30  # Or set this to match your input videos

# Output path
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out_path = os.path.join(output_dir, "collage.mp4")
out_collage = cv2.VideoWriter(out_path, fourcc, fps, (collage_width, collage_height))


#Initialize variables
frame_number = 0
flag = 0
shooter_ids = set()  #just in case the frist reset frame number is not set to 0
shooter_last_pos = dict()
scenario_number = 0
next_frame_clear = RESET_FRAME_NUMBERS[scenario_number]

#Initialize dynamic threshold
threshold_counter = 0
dynamic_weapon_conf = DYNAMIC_THR[threshold_counter]
threshold_counter += 1
next_thr_frame_num = DYNAMIC_THR_FRAME_NUMBERS[threshold_counter]

#Start loop
with tqdm(total=min(frame_counts), desc="Processing Video", unit="frame") as pbar:
    while all(cap.isOpened() for cap in caps):

        if (frame_number >= FRAME_DURATION) and (FRAME_DURATION != -1):
            break

        if frame_number >= next_frame_clear:
            flag = 0
            shooter_ids = set()
            shooter_last_pos = dict()
            scenario_number += 1
            print('Clearing database, starting scenario', scenario_number)
            try:
                clear_all_collections()
            except Exception as error:
                print(f"Error during database cleanup: {error}")
            
            next_frame_clear = RESET_FRAME_NUMBERS[scenario_number]

            # #add blank frames in output to indicate state reset
            # for i, out in enumerate(outs):
            #     blank_frame = np.zeros((frame_heights[i], frame_widths[i], 3), dtype=np.uint8)
            #     out.write(blank_frame)

        if frame_number >= next_thr_frame_num:
            dynamic_weapon_conf = DYNAMIC_THR[threshold_counter]
            # print('Threshold set to', dynamic_weapon_conf)
            threshold_counter += 1
            next_thr_frame_num = DYNAMIC_THR_FRAME_NUMBERS[threshold_counter]

        
        rets = []
        frames = []
        for cam_num, cap in enumerate(caps):
            for i in range(IGNORED_FRAMES):
                _, _ = cap.read()
            ret, frame = cap.read()

            rets.append(ret)
            frames.append(frame)
        #dont place code here 
        if not all(rets):
            break 

        if frame_number < FRAME_SKIP:  # for debugging purposes
            pbar.update(FRAMES_PER_ITER) 
            frame_number += FRAMES_PER_ITER
            continue

        YOLO_start_time = time.time()
        results = [model(frame, conf = PEOPLE_CONF, verbose=False) for frame in frames]
        YOLO_end_time = time.time()
        YOLO_time += YOLO_end_time - YOLO_start_time

        annotated_frames = frames
        annotated_frames_clean = annotated_frames.copy()

        # 'results[0].keypoints.data' is shape: (num_persons, num_keypoints, 3)
        keypoints_per_person_list = [res[0].keypoints.data for res in results]

        #-------------------- position finding ----------------------
        COM_list_of_lists = []
        for video_num, keypoints_per_person in enumerate(keypoints_per_person_list):
            COM_list = []
            if keypoints_per_person is not None:
                for person_num, person_keypoints in enumerate(keypoints_per_person): #this seems unsafe, check there are the same num of kpts and bboxes for ppl
 
                    if person_keypoints.shape[0] != 17:
                        COM_list.append(None)
                        continue
                     
                    left_ankle = person_keypoints[15]  # [x, y, conf]
                    right_ankle = person_keypoints[16] 

                    lx, ly, l_conf = left_ankle.cpu()
                    rx, ry, r_conf = right_ankle.cpu()

                    if (lx.item() == 0 and ly.item() == 0) or (rx.item() == 0 and ry.item() == 0):  #happens when person is halfway in the image
                        COM_list.append(None)
                        continue

                    if True:#l_conf > 0.2 and r_conf > 0.2:  
                        mid_x = (lx + rx) / 2.0
                        mid_y = (ly + ry) / 2.0
                        x_real, y_real = find_real_coords(int(mid_x), int(mid_y), video_num, H_list)
                        COM_list.append((mid_x, mid_y, x_real, y_real))

            COM_list_of_lists.append(COM_list)
                        
        #-------------------- Tracking ----------------------

        bbox_list = [res[0].boxes for res in results]

        track_outputs_list = []
        for video_num, bboxes in enumerate(bbox_list): #iterate though video feeds
            detection_list = []
            for bbox_num, bbox in enumerate(bboxes):
                bbox_xyxy = bbox.xyxy.cpu().numpy()
                if bbox_xyxy.shape[0] == 0:
                    continue
                x1, y1, x2, y2 = bbox_xyxy[0]
                score = float(bbox.conf[0].cpu().numpy())   
                cls_id = int(bbox.cls)          
                position = COM_list_of_lists[video_num][bbox_num] 
                if position == None: #TODO fix this, should do something about None
                    pixel_posx = 0
                    pixel_posy = 0
                    real_posx = VOID_CONST  #constant to kmnow we lost them asn shold not match thme later
                    real_posy = VOID_CONST
                else:
                    pixel_posx = position[0]
                    pixel_posy = position[1]
                    real_posx = position[2]
                    real_posy = position[3]     
                if cls_id != 0: #TODO why
                    continue
                detection_list.append([x1, y1, x2, y2, pixel_posx, pixel_posy, real_posx, real_posy, score])
        
            detection_array = np.array(detection_list)
            if len(detection_array) == 0:
                detection_array = np.zeros((0, 9), dtype=np.float32)

            # Id generator uses a static variable, so across cameras ids are distinct (good)
            track_outputs = trackers[video_num].update(detection_array, [annotated_frames[video_num].shape[0], annotated_frames[video_num].shape[1]], 
                                                                        [annotated_frames[video_num].shape[0], annotated_frames[video_num].shape[1]])
            track_outputs_list.append(track_outputs)
            

        #-------------------- Matching tracks ---------------------- assuming low camera num this is fast, change for high num
        allowed_distance = TRACK_MATCH_DISTANCE ###parameter-----                     to only compare with adjacent cameras, maybe also in area of interest
                                                                    # add "matched" param
        #TODO implement a sccore system, only allow one match and decide based on score


        # reduce last time seen for all tracks
        to_delete = []

        for id, data in shooter_last_pos.items():
            x, y, px, py, time_since_seen, last_camera_seen = data
            time_since_seen -= 1
            if time_since_seen <= 0:
                to_delete.append(id)
                shooter_ids.discard(id)
            else:
                shooter_last_pos[id] = (x, y, px, py, time_since_seen, last_camera_seen)

        # Remove expired entries after the loop
        for id in to_delete:
            del shooter_last_pos[id]
                


        #----- matching tracks to memory of shooter locations


        for video_num, track_outputs in enumerate(track_outputs_list):
            for track in track_outputs:
                _, _, real_x, real_y = track.position
                if (real_x != VOID_CONST) or (real_y != VOID_CONST):  # check the position is not a placeholder
                    
                    # Create a static list of keys to safely iterate
                    for id in list(shooter_last_pos.keys()):
                        real_x2, real_y2, pixel_x, pixel_y, _ , last_camera_seen = shooter_last_pos[id]

                        if (last_camera_seen == video_num) and not((frame_number > 18690) and (frame_number < 19200)):
                            continue
                        l2_diff = np.sqrt(np.power(real_x - real_x2, 2) + np.power(real_y - real_y2, 2))  # circle of matches

                        if l2_diff <= MEMORY_ALLOWED_DISTANCE:
                            max_id = id

                            if (track.track_id in shooter_ids):
                                shooter_ids.discard(track.track_id)
                                shooter_last_pos.pop(track.track_id, None)

                            shooter_ids.add(max_id) #redundant

                            shooter_last_pos[max_id] = (real_x, real_y, pixel_x, pixel_y, MAX_MEMORY, video_num)

                            track.track_id = max_id


        #--------matching decections between them

        for video_num, track_outputs in enumerate(track_outputs_list):
            for track in track_outputs:
                pixel_x, pixel_y, real_x, real_y = track.position
                if (real_x != VOID_CONST) or (real_y != VOID_CONST): #check the position is not a placeholder
                    for video_num2 in range(video_num + 1, len(track_outputs_list)):
                        track_outputs2 = track_outputs_list[video_num2]
                        for track2 in track_outputs2:
                            pixel_x2, pixel_y2, real_x2, real_y2 = track2.position
                            if (real_x2 != VOID_CONST) or (real_y2 != VOID_CONST):
                                l2_diff = np.sqrt(np.power(real_x - real_x2, 2) + np.power(real_y - real_y2, 2)) ##circle of matches
                                if l2_diff <= allowed_distance:
                                    max_id = max(track.track_id, track2.track_id)
                                    if (track.track_id in shooter_ids) or (track2.track_id in shooter_ids):
                                        shooter_ids.discard(track.track_id) 
                                        shooter_ids.discard(track2.track_id)
                                        shooter_ids.add(max_id)

                                        shooter_last_pos.pop(track.track_id, None)
                                        shooter_last_pos.pop(track2.track_id, None)
                                        shooter_last_pos[max_id] = ((real_x + real_x2)/2, (real_y + real_y2)/2, 
                                                                    int(pixel_x + pixel_x2/2), int(pixel_y + pixel_y2/2), MAX_MEMORY, video_num)
                                    track.track_id = max_id
                                    track2.track_id = max_id
                            
        #--------------------extended box creation--------------------
        ROI_size = ROI_WIDTH
        extended_bboxes_list = [[] for _ in range(len(annotated_frames))]
        # bbox_list holds the bboxes for all cameras
        for video_num, bboxes in enumerate(bbox_list):
            annotated_frame = annotated_frames[video_num]
            annotated_frame_height, annotated_frame_width = annotated_frame.shape[0], annotated_frame.shape[1]
            for box in bboxes:
                x1, y1, x2, y2 = box.xyxy.tolist()[0]
                w = x2 - x1
                h = y2 - y1
                extended_x1 = max(int(x1 - ROI_size*w), 0)
                extended_x2 = min(int(x1 + (1 + ROI_size)*w), annotated_frame_width)
                extended_y1 = int(y1) #TODO
                extended_y2 = int(y1 + h) #TODO
                extended_bboxes_list[video_num].append([extended_x1, extended_y1, extended_x2, extended_y2, 0]) # the last elements is a flag we need later

            extended_bboxes_list[video_num].sort(key = lambda x: x[0]) #sort from left to right for the next part to not miss any box

            
        #--------------------extended box fusing into ROIs-------------------- 
        ROI_list = [[] for _ in range(len(annotated_frames))]
        for video_num, extended_bboxes in enumerate(extended_bboxes_list):
            annotated_frame = annotated_frames[video_num]
            for i in range(len(extended_bboxes)):
                if extended_bboxes[i][4] == 1:  #check if box has already been used
                    continue
                newx1, newy1, newx2, newy2, _ = extended_bboxes[i]
                for j in range (i + 1, len(extended_bboxes)):
                    px1, py1, px2, py2, _ = extended_bboxes[j]
                    if (newx1 <= px1 < newx2) and ((newy1 < py1 < newy2) or (newy1 < py2 < newy2) 
                                                    or (py1 < newy1 < py2) or (py1 < newy2 < py2)):
                        newx1 = min(newx1, px1)
                        newy1 = min(newy1, py1)
                        newx2 = max(newx2 ,px2)
                        newy2 = max(newy2, py2)

                        extended_bboxes[j][4] = 1 # raise box used flag
                    elif px1 > newx2: ##no other boxes will overlap with newx1, newy1, newx2, newy2
                        break

                roi = (newx1, newy1, newx2, newy2)  
                ROI_list[video_num].append(roi)

        #--------------------create individual crops-------------------- 
        patches_list = [[] for _ in range(len(annotated_frames))]
        for video_num, ROIs in enumerate(ROI_list):
            annotated_frame = annotated_frames[video_num]
            for roi in ROIs:
                x1, y1, x2, y2 = roi
                crop = annotated_frame[y1:y2, x1:x2].copy()
                patches_list[video_num].append((crop, roi))
                        
        #-------------------- detect and display guns ----------------------
        weapon_bbox_list = [[] for _ in range(len(annotated_frames))]
        gun_start_time = time.time()
        if frame_number > GUN_DETECTION_FRAME_START:
            for video_num, patches in enumerate(patches_list):
                annotated_frame = annotated_frames[video_num]
                weapon_bbox_list[video_num].append(0) #initialize weapon count
                for patch in patches:
                    pred_bboxes = find_weapons_relative(annotated_frame, patch) 
                    weapon_count = pred_bboxes[3] #scalar
                    weapon_class = pred_bboxes[2] #array
                    weapon_scores = pred_bboxes[1] #array
                    weapon_boxes = pred_bboxes[0] #array
                    for i in range(weapon_count):
                        weapon_bbox_list[video_num].append((weapon_boxes[i], weapon_scores[i], weapon_class[i]))
                    weapon_bbox_list[video_num][0] += weapon_count
        else:
            for video_num in range(number_of_videos):
                weapon_bbox_list[video_num].append(0)

        gun_end_time = time.time()
        gun_time += gun_end_time - gun_start_time
        #-------------------- associate guns to ppl ----------------------  #NOTE STEP THIS WOULD WORK A LOT BETTER WITH A SEGMENTATION MODEL 
        for video_num, weapon_bboxes in enumerate(weapon_bbox_list):
            # weapon_bboxes has structure [num_weapons, n tuples of structure (weapon_boxes[i], weapon_scores[i], weapon_class[i])]
            weapon_count = weapon_bboxes[0]
            for i in range(weapon_count):
                weapon_box, weapon_score, weapon_class = weapon_bboxes[i + 1]
                if weapon_score < dynamic_weapon_conf:  
                    continue
                wx1, wy1, wx2, wy2 = weapon_box
                weapon_center = ((wx1 + wx2)/2, (wy1 + wy2)/2)

                for track in track_outputs_list[video_num]:               
                    px1, py1, px2, py2 = track.tlbr
                    #EXTEND BBOXES
                    w = px2 - px1
                    h = py2 - py1
                    annotated_frame = annotated_frames[video_num]
                    annotated_frame_width = annotated_frame.shape[1]

                    extended_x1 = max(int(px1 - BBOX_EXTENSION_FOR_WPN_ASSOC*w), 0)
                    extended_x2 = min(int(px1 + (1 + BBOX_EXTENSION_FOR_WPN_ASSOC)*w), annotated_frame_width)
                    extended_y1 = int(py1) #TODO
                    extended_y2 = int(py2) #TODO
                    # Check if weapon center is inside person's EXTENDED bounding box
                    if (extended_x1 < weapon_center[0] < extended_x2) and (extended_y1 < weapon_center[1] < extended_y2) and (track.track_id not in shooter_ids):
                        shooter_ids.add(track.track_id)
                        print(f"weapon detected in video {video_num}, associated to id {track.track_id}, frame {frame_number}")
                        
                        
                        if True:
                        #send image, Note it is extended further for visualization
                            w = px2 - px1
                            h = py2 - py1
                            annotated_frame = annotated_frames[video_num]
                            annotated_frame_width = annotated_frame.shape[1]
                            extended_x1 = max(int(px1 - ROI_size*w), 0)
                            extended_x2 = min(int(px1 + (1 + ROI_size)*w), annotated_frame_width)
                            extended_y1 = int(py1) #TODO
                            extended_y2 = int(py2) #TODO
                            snapshot = annotated_frame[int(extended_y1):int(extended_y2), int(extended_x1):int(extended_x2)].copy()
                            send_shooter_image_artur(snapshot)
                            flag = 1
                        # send_shooter_image()

        #--- save last seen pos of shooter 

        for video_num, track_outputs in enumerate(track_outputs_list):
            for t in track_outputs:
                    track_id = t.track_id
                    if track_id in shooter_ids:
                        pixel_x, pixel_y, real_x, real_y = t.position
                        if (real_x != VOID_CONST) or (real_y != VOID_CONST): 
                            shooter_last_pos[track_id] = (real_x, real_y, pixel_x, pixel_y, MAX_MEMORY, video_num)

                        
        


        #-------------------- display bboxes and ROIs ----------------------

        for video_num, bboxes in enumerate(bbox_list):
            annotated_frame = annotated_frames[video_num]
            if DISPLAY_PEOPLE_BOXES:
                    for box in bboxes:
                        x1, y1, x2, y2 = box.xyxy.tolist()[0]
                        cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), COLOR_CIAN, 2)
                        
                    counter = 0
                    for box in extended_bboxes_list[video_num]:
                        counter += 1
                        x1, y1, x2, y2, flag = box
                        cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), COLOR_YELLOW, 2)
                        # cv2.putText(annotated_frame, str(counter), (int((y2 + y1)/2), int((x2 + x1)/2)), 1, fontScale=0.5, color = COLOR_GREEN, lineType=cv2.LINE_AA)
            
            if DISPLAY_ROIS:
                ROIs = ROI_list[video_num]
                for box in ROIs:
                    x1, y1, x2, y2 = box
                    cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), COLOR_BLUE, 2)
        #-------------------- display tracks ----------------------
        for video_num, track_outputs in enumerate(track_outputs_list):
            for t in track_outputs:
                    tlwh = t.tlwh  
                    track_id = t.track_id
                    pixel_x, pixel_y, real_x, real_y = t.position

                    x1, y1, w, h = tlwh
                    x2, y2 = x1 + w, y1 + h
                    #display bbox
                    if track_id in shooter_ids:
                        bbox_color = COLOR_RED
                        cv2.putText(annotated_frames[video_num], f"THREAT", (int(x1) + 50, int(y1) - 5),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.6, bbox_color, 2)
                        if frame_number % (FRAMES_PER_ITER * 10) == 0:
                            send_coordinates(real_x, real_y)

                    else:
                        bbox_color = COLOR_GREEN
                    if DISPLAY_TRACKS:
                        cv2.rectangle(annotated_frames[video_num], (int(x1), int(y1)), (int(x2), int(y2)), bbox_color, 2)
                        cv2.putText(annotated_frames[video_num], f"ID: {track_id}", (int(x1), int(y1) - 5),
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.6, bbox_color, 2)
                    
                    if DISPLAY_COM:
                        cv2.circle(annotated_frames[video_num], (int(pixel_x), int(pixel_y)), 5, bbox_color, -1)
                        x_real, y_real = find_real_coords(int(pixel_x), int(pixel_y), video_num, H_list)
                        cv2.putText(annotated_frames[video_num], f"{real_x:.2f}, {real_y:.2f}", (int(pixel_x) - 20, int(pixel_y) - 20), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, bbox_color, 2, cv2.LINE_AA)
                        
        # ---- Display shooter memory

        for id, data in shooter_last_pos.items():
            real_x, real_y, pixel_x, pixel_y, time_since_seen, last_camera_seen = data
            if time_since_seen < MAX_MEMORY - 1:
                bbox_color = COLOR_RED
                cv2.circle(annotated_frames[last_camera_seen], (int(pixel_x), int(pixel_y)), 5, bbox_color, -1)
                x_real, y_real = find_real_coords(int(pixel_x), int(pixel_y), last_camera_seen, H_list)
                cv2.putText(annotated_frames[last_camera_seen], f"ID: {id}, t: {time_since_seen}, {real_x:.1f}, {real_y:.1f}", (int(pixel_x) + 10, int(pixel_y) + 10), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, bbox_color, 2, cv2.LINE_AA)
                send_coordinates_past(real_x, real_y)
                        

        
        #-------------------- write video ----------------------
        cv2.putText(annotated_frames[0], f"THR: {dynamic_weapon_conf}", (50, 50), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_RED, 2, cv2.LINE_AA)
        for i, out in enumerate(outs):
            out.write(annotated_frames[i])

        #create collage

        resized = [cv2.resize(f, target_size) for f in annotated_frames]
        row1 = np.hstack([resized[0], resized[0], resized[1]])
        row2 = np.hstack(resized[2:])
        collage = np.vstack([row1, row2])

        out_collage.write(collage)
        
        pbar.update(FRAMES_PER_ITER)  
        frame_number += FRAMES_PER_ITER


for cap in caps:
    cap.release()

for out in outs:
    out.release()

out_collage.release()


cv2.destroyAllWindows()

print(f"total execution time in gun detection model: {(gun_time/60.0):.2f} minutes")

print(f"total execution time in YOLO detection model: {(YOLO_time/60.0):.2f} minutes")


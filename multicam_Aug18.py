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
from firebase_config_backend import add_document
from concurrent.futures import ThreadPoolExecutor
from firebase_config_backend import COLLECTIONS, FIREBASE_DB_URL
import requests
import shutil
from collections import deque


_executor = ThreadPoolExecutor(max_workers=2)

# tf.config.set_visible_devices([], 'GPU')  # Force CPU execution
# print("Using only CPU for execution")

# -------------------- CONSTANT DEFINITION --------------------

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

DISPLAY_STATE_RESET_DURATION = 10
# -------------------- CONFIG PARAMETERS DEFINITION --------------------

DISPLAY_TRACKS = True  #green or red (shooter)
DISPLAY_COM = True #green or red (shooter)
DRAW_GUN_BBOX = True  #purple
DISPLAY_PEOPLE_BOXES = False #cian and yellow  #TODO see why it does not always match track bbox
DISPLAY_ROIS = True #blue
DISPLAY_LOST_SHOOTER_POSITIONS = True

START_FRAME_NUMBER = 1500
FRAME_DURATION =  8000 # -1 for full video

GUN_DETECTION_FRAME_START = 0   

PEOPLE_CONF = 0.6
ALLOWED_BETWEEN_CAMERA_MATCH_DISTANCE = 3
MEMORY_ALLOWED_DISTANCE = 2.5

EXTENDED_BBOX_WIDTH = 0.5
EXTENDED_BBOX_HEIGHT = 0


BBOX_EXTENSION_FOR_WPN_ASSOC = 0.2

NUM_CAMERAS = 5

IGNORED_FRAMES = 0
FRAMES_PER_ITER = IGNORED_FRAMES + 1

MAX_FRAMES_SINCE_SEEN = int(108 / FRAMES_PER_ITER) ## frames of memory

# TODO when the person is super small ignore for wpn detectoin, otherwise we stretch the image too much

RESET_FRAME_NUMBERS = [
    0,
    INF_CONST
]
NUMBER_OF_RESETS = len(RESET_FRAME_NUMBERS)

USE_DYNAMIC_THRESHOLD = False

STATIC_WEAPON_THRESHOLD = 0.7

NUM_STORED_COORDINATES = 4
STARTING_COORD_VALUE = INF_CONST
DEFAULT_CAMERA_VALUE = 0

DYNAMIC_THR_FRAME_NUMBERS = [
    3*0,
    3*1450,
    3*2200,
    3*2260,
    3*3035,
    3*3240,
    3*3830,
    11980,
    12020,
    3*4780,
    3*5140,
    3*6020,
    18500 + 628,
    18500 + 635,
    3*7000,
    3*7160,
    23180,
    23947,
    24000,
    INF_CONST]
DYNAMIC_THR = [
    1.0,
    0.7,
    0.3,
    1.0,
    0.5,
    1.0,
    0.7,
    1.0,
    0.7,
    0.5,
    1.0,
    0.7,
    1.0,
    0.7,
    0.5,
    1.0,
    0.5,
    1.0,
    0.6,
    1.0
]

MIN_AREA_TO_USE_CROP = 0
# -------------------Weapon detection functions--------------------
class current_shooter_class:
    def __init__(self, id, real_x, real_y, pixel_x, pixel_y, camera_id):
        self.id = id
        self.coordinate_history = deque([(STARTING_COORD_VALUE, STARTING_COORD_VALUE, DEFAULT_CAMERA_VALUE)] * NUM_STORED_COORDINATES, maxlen=NUM_STORED_COORDINATES)
        self.update_coordinates(real_x, real_y, pixel_x, pixel_y, camera_id)

    def update_coordinates(self, real_x, real_y, pixel_x, pixel_y, camera_id): #overwrites oldest entry, linked list style
        self.real_x = real_x
        self.real_y = real_y
        self.pixel_x = pixel_x
        self.pixel_y = pixel_y
        self.camera_id = camera_id
        self.coordinate_history.append((real_x, real_y, camera_id))

    def import_coord_history(self, lost_shooter_history):
        self.coordinate_history = lost_shooter_history
        return

    def get_history(self):
        return list(self.coordinate_history) # list of tuples
    
    def get_coord_data(self):
        return (self.real_x, self.real_y, self.pixel_x, self.pixel_y, self.camera_id)

    def __repr__(self):
        return (f"ShooterCoordinates(id={self.id}, real=({self.real_x:.2f}, {self.real_y:.2f}), "
                f"pixel=({self.pixel_x}, {self.pixel_y}), camera={self.camera_id}, "
                f"history={list(self.coordinate_history)})")
    
class lost_shooter_class:
    def __init__(self, not_so_current_shooter: current_shooter_class):
        self.id = not_so_current_shooter.id
        self.real_x = not_so_current_shooter.real_x
        self.real_y = not_so_current_shooter.real_y
        self.pixel_x = not_so_current_shooter.pixel_x
        self.pixel_y = not_so_current_shooter.pixel_y
        self.camera_id = not_so_current_shooter.camera_id
        self.frames_since_seen = 0
        self.coordinate_history = not_so_current_shooter.coordinate_history

    def get_coord_data(self):
        return (self.real_x, self.real_y, self.pixel_x, self.pixel_y, self.camera_id)
    
    def get_frames_since_seen(self):
        return self.frames_since_seen
    
    def increment_frames_since_seen(self):
        self.frames_since_seen += 1
        self.coordinate_history.append((self.real_x, self.real_y, self.camera_id)) # to remove old coords in case we also want to do trail
        return self.frames_since_seen
    
    def get_history(self):
        return list(self.coordinate_history) # list of tuples
    
    def __repr__(self):
        return (f"Detection(id={self.id}, real=({self.real_x:.2f}, {self.real_y:.2f}), "
                f"pixel=({self.pixel_x}, {self.pixel_y}), camera={self.camera_id}), "
                f"history={list(self.coordinate_history)}), frames since seen={self.frames_since_seen}")      

def clear_collection(collection):
    """Clear all entries in a specific collection"""
    try:
        # print(f"Clearing all entries in {collection}...")
        url = f"{FIREBASE_DB_URL}/{collection}.json"
        response = requests.delete(url)
        response.raise_for_status()  # Raise an exception for HTTP errors
        # print(f"Successfully cleared all entries in {collection}")
    except Exception as error:
        print(f"Error clearing entries in {collection}: {error}")

def clear_all_collections():
    """Clear all entries in all collections"""
    print("Starting database cleanup...")
    
    # Clear each collection
    clear_collection(COLLECTIONS.SHOOTER_IMAGE)
    clear_collection(COLLECTIONS.SHOOTER_VERIFICATION)
    clear_collection(COLLECTIONS.SHOOTER_COORDINATES)
    clear_collection(COLLECTIONS.LOST_SHOOTER_COORDINATES)
    
    print("Database cleanup complete! All collections have been cleared.")
    print("You can now start testing with a fresh database.")

def send_current_shooter_coords(shooter_list: list[current_shooter_class]):
    if shooter_list:
        try:
            clear_collection(COLLECTIONS.SHOOTER_COORDINATES)

            batch_ts = int(time.time() * 1000)

            shooter_data = {"timestamp": batch_ts}

            for current_shooter in shooter_list:
                shooter_data[str(current_shooter.id)] = {
                    "coordinate_history": current_shooter.get_history(),
                    "camera_id": current_shooter.camera_id
                }

            _executor.submit(add_document, COLLECTIONS.SHOOTER_COORDINATES, shooter_data)
            return

        except Exception as error:
            print(f"Error sending coordinates: {error}")
            return None
    else:
        return
    
def send_lost_shooter_coords(shooter_list: list[lost_shooter_class]):
    if shooter_list:
        try:
            clear_collection(COLLECTIONS.LOST_SHOOTER_COORDINATES)

            batch_ts = int(time.time() * 1000)

            shooter_data = {"timestamp": batch_ts}

            for lost_shooter in shooter_list:
                shooter_data[str(lost_shooter.id)] = {
                    "coordinate_history": lost_shooter.get_history(),
                    "camera_id": lost_shooter.camera_id
                }

            _executor.submit(add_document, COLLECTIONS.LOST_SHOOTER_COORDINATES, shooter_data)
            return

        except Exception as error:
            print(f"Error sending coordinates: {error}")
            return None
    else:
        return

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

def format_boxes(bboxes, image_height, image_width):
    for box in bboxes:
        ymin = int(box[0] * image_height)
        xmin = int(box[1] * image_width)
        ymax = int(box[2] * image_height)
        xmax = int(box[3] * image_width)
        box[0], box[1], box[2], box[3] = xmin, ymin, xmax, ymax
    return bboxes

def draw_bbox(image, bboxes, dynamic_weapon_conf_thr, show_label=True, allowed_classes=""):
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
        if score < dynamic_weapon_conf_thr:
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
        draw_bbox(annotated_frame, pred_bbox, dynamic_weapon_conf_thr, show_label=True, allowed_classes=allowed_classes)
    return pred_bbox

def calculate_feet_position(person_keypoints, video_num):
    kpts_xy = person_keypoints.data.cpu().numpy()
    if kpts_xy.shape != (1, 17, 3):
        print(f"kpts shape: {kpts_xy.shape}")
        return None
    
    left_ankle = kpts_xy[0, 15]  # [x, y, conf]
    right_ankle = kpts_xy[0, 16] 

    lx, ly, l_conf = left_ankle
    rx, ry, r_conf = right_ankle

    if (lx.item() == 0 and ly.item() == 0) or (rx.item() == 0 and ry.item() == 0):  #happens when person is halfway in the image
        return None

    if True:#l_conf > 0.2 and r_conf > 0.2:  
        mid_x = (lx + rx) / 2.0
        mid_y = (ly + ry) / 2.0
        x_real, y_real = find_real_coords(int(mid_x), int(mid_y), video_num, H_list)
        return(mid_x, mid_y, x_real, y_real)

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

# -------------------Homography part--------------------
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

H_list = [None] * NUM_CAMERAS
H_list[0], mask1 = cv2.findHomography(image_points_2, world_points_2, cv2.RANSAC)
H_list[1], mask1 = cv2.findHomography(image_points_3, world_points_3, cv2.RANSAC)
H_list[2], mask1 = cv2.findHomography(image_points_4, world_points_4, cv2.RANSAC)
H_list[3], mask1 = cv2.findHomography(image_points_5, world_points_5, cv2.RANSAC)
H_list[4], mask1 = cv2.findHomography(image_points_6, world_points_6, cv2.RANSAC)

# H_list[5], mask1 = cv2.findHomography(image_points_1, world_points_1, cv2.RANSAC)

# -------------------- INITIALIZE TRACKERS --------------------

class TrackArgs:
    track_thresh = 0.5
    # high_thresh = 0.5
    # new_track_thresh = 0.6
    match_thresh = 0.8
    track_buffer = 30
    mot20 = False  # or True if needed

bytetrack_args = TrackArgs()

trackers = [BYTETracker(bytetrack_args, frame_rate=(30/FRAMES_PER_ITER)) for _ in range(NUM_CAMERAS)] 

# -------------------- INITIALIZE GUN DETECTION MODEL ----------------------

path="Models"
iterateai_model = tf.saved_model.load(path)
infer_weapon = iterateai_model.signatures['serving_default']
allowed_classes = ["Gun","Rifle"]#["Gun","Knife","Rifle"]

# -------------------- INITIALIZE POSE ESTIMATION MODEL --------------------

model = YOLO("yolo11l-pose.pt")

# -------------------- INITIALIZE CAMERA FEEDS AND  --------------------

video_names = [ 'camera_2_synced',
                'camera_3_synced',
                'camera_4_synced',
                'camera_5_synced',
                'camera_6_synced']

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

    if START_FRAME_NUMBER > 0:
        cap.set(cv2.CAP_PROP_POS_FRAMES, START_FRAME_NUMBER)

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

# -------------------- OUTPUT COLLAGE PARAMETERS  --------------------

target_size = (480, 270)  # Resize all frames to this size (W x H)
cols, rows = 3, 2
collage_width = cols * target_size[0]
collage_height = rows * target_size[1]
fps = 30  

# Output path
fourcc = cv2.VideoWriter_fourcc(*'mp4v')
out_path = os.path.join(output_dir, "collage.mp4")
out_collage = cv2.VideoWriter(out_path, fourcc, fps, (collage_width, collage_height))

# -------------------- VARIABLE INITIALIZATION  --------------------

video_process_time = 0
collage_process_time = 0
post_db_time = 0

yellow_point_active = 0

frame_number = START_FRAME_NUMBER
scenario_number = 0
display_state_reset = 0
current_shooters_dict: dict[int, current_shooter_class] = {}
lost_shooters_dict: dict[int, lost_shooter_class] = {}
updated_shooter_ids = dict() 
next_frame_clear = RESET_FRAME_NUMBERS[scenario_number]

#Initialize dynamic threshold
if USE_DYNAMIC_THRESHOLD:
    threshold_counter = 0
    dynamic_weapon_conf_thr = DYNAMIC_THR[threshold_counter]
    threshold_counter += 1
    next_thr_frame_num = DYNAMIC_THR_FRAME_NUMBERS[threshold_counter]
else:
    dynamic_weapon_conf_thr = STATIC_WEAPON_THRESHOLD

clear_all_collections()
# -------------------- LOOP START  --------------------

with tqdm(total=min(frame_counts), initial = START_FRAME_NUMBER, desc="Processing Video", unit="frame") as pbar:
    while all(cap.isOpened() for cap in caps):

        if (frame_number >= FRAME_DURATION) and (FRAME_DURATION != -1):
            break

        #clear all shooter info
        if frame_number >= next_frame_clear:
            current_shooters_dict: dict[int, current_shooter_class] = {}
            lost_shooters_dict: dict[int, lost_shooter_class] = {}
            updated_shooter_ids = dict() 
            scenario_number += 1
            print('Clearing database, starting scenario', scenario_number)
            try:
                clear_all_collections()
            except Exception as error:
                print(f"Error during database cleanup: {error}")
            
            next_frame_clear = RESET_FRAME_NUMBERS[scenario_number]

            display_state_reset = DISPLAY_STATE_RESET_DURATION

        if USE_DYNAMIC_THRESHOLD and frame_number >= next_thr_frame_num:
            dynamic_weapon_conf_thr = DYNAMIC_THR[threshold_counter]
            print('Threshold set to', dynamic_weapon_conf_thr)
            threshold_counter += 1
            next_thr_frame_num = DYNAMIC_THR_FRAME_NUMBERS[threshold_counter]

        #fetch next frames
        video_process_start_time = time.time()
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
        video_process_time += time.time() - video_process_start_time

        # -------------------- RUN POSE DETECTION ----------------------

        YOLO_start_time = time.time()
        results = [model(frame, conf = PEOPLE_CONF, verbose=False) for frame in frames]
        YOLO_time += time.time() - YOLO_start_time

        annotated_frames = frames

        # 'results[0].keypoints.data' is shape: (num_persons, num_keypoints, 3)
        keypoints_per_person_list = [res[0].keypoints.data for res in results]

        # -------------------- position finding ----------------------
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
                        
        # -------------------- POSITION FINDING AND TRACKING ----------------------

        bbox_list = [res[0].boxes for res in results] # res[0].boxes (TODO O AS ONLY 1 IMAGE?) is shape num_detections x 6, 6 comes from  x, y, x, y, classid, conf NOT THAT ORDER?
        keypoints_per_person_list = [res[0].keypoints for res in results]

        track_outputs_list = []

        #debugging TODO manage this to avoid fatal error at runtime if it happened - this should never happen though
        if len(bbox_list) != len(keypoints_per_person_list):
            raise RuntimeError(f" len(bbox_list) != len(keypoints_per_person_list) (number of streams so should match), bbox: {len(bbox_list)}, kpts: {len(keypoints_per_person_list)} ")
        
        for video_num in range(len(bbox_list)): #iterate though video feeds

            bboxes_in_single_frame = bbox_list[video_num]
            keypoints_in_single_frame = keypoints_per_person_list[video_num]

            detection_list = []
            
            # # debugging TODO manage this to avoid fatal error at runtime if it happenen
            # print("-----------------")
            # print(f" bbox {bboxes_in_single_frame.shape[0]}, kpts {(bboxes_in_single_frame.shape)}")
            # print("-")
            # print(f" bbox {bboxes_in_single_frame}")
            # print("----")
            # print(f"kpts {keypoints_in_single_frame}")
            
            for detection_num in range(bboxes_in_single_frame.shape[0]):

                bbox = bboxes_in_single_frame[detection_num]
                detection_keypoints = keypoints_in_single_frame[detection_num] #TODO maybe try catch in case acces out of bounds

                bbox_xyxy = bbox.xyxy.cpu().numpy() #returns tensor of shape 1x4 if valid detection

                if bbox_xyxy.shape[0] == 0:# debugging
                    print("SHOULDN'T HAPPEN: bbox_xyxy.shape[0] == 0")
                    continue

                x1, y1, x2, y2 = bbox_xyxy[0]
                bbox_conf = float(bbox.conf[0].cpu().numpy())   
                class_id = int(bbox.cls)          
                position = COM_list_of_lists[video_num][detection_num]

                #calculate feet position
                 
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

                # debugging
                position_nicer = calculate_feet_position(detection_keypoints, video_num)
                if position_nicer == None: #TODO fix this, should do something about None
                    mid_x = 0
                    mid_y = 0
                    x_real = VOID_CONST  #constant to kmnow we lost them asn shold not match thme later
                    y_real = VOID_CONST
                else:
                    mid_x = position_nicer[0]
                    mid_y = position_nicer[1]
                    x_real = position_nicer[2]
                    y_real = position_nicer[3]  

                if (mid_x != pixel_posx) or (mid_y != pixel_posy) or (x_real != real_posx) or (y_real != real_posy):
                    print(f"[DEBUG] Position mismatch for video {video_num}: "
                            f"pixel ({pixel_posx:.2f}, {pixel_posy:.2f}) vs feet ({mid_x:.2f}, {mid_y:.2f}), "
                            f"real ({real_posx:.2f}, {real_posy:.2f}) vs feet_real ({x_real:.2f}, {y_real:.2f})")


                if class_id != 0: #only detect people
                    continue
                detection_list.append([x1, y1, x2, y2, pixel_posx, pixel_posy, real_posx, real_posy, bbox_conf])
        
            if len(detection_list) == 0:
                detection_array = np.zeros((0, 9), dtype=np.float32)
            else:
                detection_array = np.array(detection_list)

            # Id generator uses a static variable, so across cameras ids are distinct (good)
            track_outputs = trackers[video_num].update(detection_array, [annotated_frames[video_num].shape[0], annotated_frames[video_num].shape[1]], 
                                                                        [annotated_frames[video_num].shape[0], annotated_frames[video_num].shape[1]])
            track_outputs_list.append(track_outputs)
        
        # -------------------- REMOVE STALE LOST SHOOTERS ----------------------

        to_delete = []

        for id, shooter in lost_shooters_dict.items():
            frames_since_seen = shooter.increment_frames_since_seen()
            if frames_since_seen >= MAX_FRAMES_SINCE_SEEN:
                to_delete.append(id)

        # Remove expired entries after the loop
        for id in to_delete:
            del lost_shooters_dict[id]

        # -------------------- UNIFY TRACK IDS ACROSS CAMERAS (indep of shooter or not) ----------------------
        #TODO not really sure if this happens every time or if the track_id update sticks, if only once handled with (track.track_id !=track2.track_id)
        # assuming low camera num this is fast, change for high num
        #  ###parameter-----                     to only compare with adjacent cameras, maybe also in area of interest
                                                                    # add "matched" param
        #TODO implement a sore system, only allow one match and decide based on score    
    
        allowed_distance = ALLOWED_BETWEEN_CAMERA_MATCH_DISTANCE       

        all_track_ids = set() #while we are at it create this for later
        for video_num, track_outputs in enumerate(track_outputs_list):
            for track in track_outputs:
                all_track_ids.add(track.track_id)
                pixel_x, pixel_y, real_x, real_y = track.position
                if (real_x != VOID_CONST) or (real_y != VOID_CONST): #check the position is not a placeholder
                    for video_num2 in range(video_num + 1, len(track_outputs_list)):
                        track_outputs2 = track_outputs_list[video_num2]
                        for track2 in track_outputs2:
                            pixel_x2, pixel_y2, real_x2, real_y2 = track2.position
                            if (real_x2 != VOID_CONST) or (real_y2 != VOID_CONST):
                                l2_diff = np.sqrt(np.power(real_x - real_x2, 2) + np.power(real_y - real_y2, 2)) ##circle of matches
                                if l2_diff <= allowed_distance:
                                    if (track.track_id in current_shooters_dict) and (track2.track_id in current_shooters_dict) and (track.track_id !=track2.track_id):
                                        #very odd, shouldn't happen
                                        max_id = max(track.track_id, track2.track_id) #arbitrarily pick 
                                        min_id = min(track.track_id, track2.track_id) #TODO LOW-PRIORITY maybe improve this
                                        current_shooters_dict.pop(min_id, None)
                                        updated_shooter_ids[min_id] = max_id
                                        id_to_keep = max_id
                                        id_to_discard = min_id
                                        
                                        

                                    elif (track.track_id in current_shooters_dict): #Implicit the other is not
                                        id_to_keep = track.track_id
                                        id_to_discard = track2.track_id
                                        

                                    elif (track2.track_id in current_shooters_dict):#Implicit the other is not
                                        id_to_keep = track2.track_id
                                        id_to_discard = track.track_id
                                    else:
                                        max_id = max(track.track_id, track2.track_id) #choose whichever
                                        min_id = min(track.track_id, track2.track_id)
                                        id_to_keep = max_id
                                        id_to_discard = min_id

                                    all_track_ids.discard(id_to_discard)
                                    track.track_id = id_to_keep
                                    track2.track_id = id_to_keep

                                    if (track.track_id in current_shooters_dict) or (track2.track_id in current_shooters_dict):
                                        current_shooters_dict[id_to_keep].update_coordinates((real_x + real_x2)/2, (real_y + real_y2)/2, 
                                                                    int((pixel_x + pixel_x2)/2), int((pixel_y + pixel_y2)/2), video_num)

        # -------------------- MIGRATE MISSING SHOOTERS TO LOST SHOOTERS DICT ----------------------

        shooters_not_found_in_new_tracks = set()
        for shooter_id, current_shooter in current_shooters_dict.items(): #very sad way to do this btw
            if shooter_id not in all_track_ids:
                shooters_not_found_in_new_tracks.add(shooter_id)
                lost_shooters_dict[shooter_id] = lost_shooter_class(current_shooter)

        for id in shooters_not_found_in_new_tracks:
            current_shooters_dict.pop(id, None)

        # -------------------- UPDATE SHOOTER POSITIONS WITH NEW TRACKS' POSITIONS ----------------------

        for video_num, track_outputs in enumerate(track_outputs_list):
            for track in track_outputs:
                track_id = track.track_id
                if track_id in current_shooters_dict:
                    pixel_x, pixel_y, real_x, real_y = track.position
                    if (real_x != VOID_CONST) or (real_y != VOID_CONST): #TODO should convey we are no longer finding the shooters position ? not sure what I meant
                        current_shooters_dict[track_id].update_coordinates(real_x, real_y, pixel_x, pixel_y, video_num)  #TODO LOW-P will be overwriten if send from multiple angles, but same value
        
        # -------------------- Matching tracks ---------------------- assuming low camera num this is fast, change for high num
        allowed_distance = ALLOWED_BETWEEN_CAMERA_MATCH_DISTANCE ###parameter-----                     to only compare with adjacent cameras, maybe also in area of interest
                                                                    # add "matched" param
        #TODO implement a sore system, only allow one match and decide based on score           

        
        # -------------------- MATCHING TRACKS TO MEMORY OF LOST SHOOTER LOCATIONS ----------------------

        for video_num, track_outputs in enumerate(track_outputs_list):
            for track in track_outputs: # we dont care if the track is a shooter, as it could have been redetected in the new camera
                track_pixel_x, track_pixel_y, track_real_x, track_real_y = track.position
                if (track_real_x != VOID_CONST) or (track_real_y != VOID_CONST):  # check the position is not a placeholder
                    # Create a static list of keys to safely iterate
                    for lost_shooter_id in list(lost_shooters_dict.keys()):
                        lost_shooter = lost_shooters_dict[lost_shooter_id]
                        ls_real_x, ls_real_y, ls_pixel_x, ls_pixel_y, last_camera_seen = lost_shooter.get_coord_data()
                        l2_diff = np.sqrt(np.power(track_real_x - ls_real_x, 2) + np.power(track_real_y - ls_real_y, 2))  # circle of matches

                        if l2_diff <= MEMORY_ALLOWED_DISTANCE:
                            if (track.track_id in current_shooters_dict): # if the new detection was also identified as a shooter
                                #note this path will usually not happen since we first map memory to tracks and then scan for weapons 
                                #TODO rework logic to retain coord_history
                                updated_shooter_ids[lost_shooter_id] = track.trackid # so that if the old shooter is confirmed we map that confirmation to the new one 
                                lost_shooters_dict.pop(lost_shooter_id, None)
                                
                            else:
                                new_shooter = current_shooter_class(lost_shooter_id, track_real_x, track_real_y, track_pixel_x, track_pixel_y, video_num)
                                new_shooter.import_coord_history(lost_shooter.coordinate_history)
                                current_shooters_dict[lost_shooter_id] = new_shooter
                                track.track_id = lost_shooter_id
                                lost_shooters_dict.pop(lost_shooter_id, None)
                                             
        # ---------------------- EXTENDED BOX CREATION ----------------------
        extended_bboxes_list = [[] for _ in range(len(annotated_frames))]
        # bbox_list holds the bboxes for all cameras
        for video_num, bboxes in enumerate(bbox_list):
            annotated_frame = annotated_frames[video_num]
            annotated_frame_height, annotated_frame_width = annotated_frame.shape[0], annotated_frame.shape[1]
            for box in bboxes:
                x1, y1, x2, y2 = box.xyxy.tolist()[0]
                w = x2 - x1
                h = y2 - y1
                extended_x1 = max(int(x1 - EXTENDED_BBOX_WIDTH*w), 0)
                extended_x2 = min(int(x1 + (1 + EXTENDED_BBOX_WIDTH)*w), annotated_frame_width)
                extended_y1 = max(int(y1 - EXTENDED_BBOX_HEIGHT*h), 0) 
                extended_y2 = min(int(y1 + (1 + EXTENDED_BBOX_HEIGHT)*h), annotated_frame_height)
                extended_bboxes_list[video_num].append([extended_x1, extended_y1, extended_x2, extended_y2, 0]) # the last elements is a flag we need later

            extended_bboxes_list[video_num].sort(key = lambda x: x[0]) #sort from left to right for the next part to not miss any box

            
        # ---------------------- EXTENDED BOX FUSING INTO ROIS ---------------------- 

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

        # ---------------------- CREATE INDIVIDUAL CROPS ---------------------- 

        patches_list = [[] for _ in range(len(annotated_frames))]
        for video_num, ROIs in enumerate(ROI_list):
            annotated_frame = annotated_frames[video_num]
            for roi in ROIs:
                x1, y1, x2, y2 = roi
                h = x2 - x1
                w = y2 - y1
                if (h*w >= MIN_AREA_TO_USE_CROP):
                    crop = annotated_frame[y1:y2, x1:x2].copy()
                    patches_list[video_num].append((crop, roi))
                        
        # ---------------------- DETECT AND DISPLAY GUNS ----------------------

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

        # ---------------------- ASSOCIATE GUNS TO TRACKS (AND IDS) ----------------------  #NOTE STEP THIS WOULD WORK A LOT BETTER WITH A SEGMENTATION MODEL 

        for video_num, weapon_bboxes in enumerate(weapon_bbox_list):
            # weapon_bboxes has structure [num_weapons, n tuples of structure (weapon_boxes[i], weapon_scores[i], weapon_class[i])]
            weapon_count = weapon_bboxes[0]
            for i in range(weapon_count):
                weapon_box, weapon_score, weapon_class = weapon_bboxes[1 + i]
                if weapon_score < dynamic_weapon_conf_thr:  # I think redundant but ok
                    continue
                wx1, wy1, wx2, wy2 = weapon_box
                weapon_center = ((wx1 + wx2)/2, (wy1 + wy2)/2)

                for track in track_outputs_list[video_num]:               
                    px1, py1, px2, py2 = track.tlbr
                    #EXTEND BBOXES
                    annotated_frame = annotated_frames[video_num]
                    annotated_frame_width = annotated_frame.shape[1]

                    w = px2 - px1
                    h = py2 - py1
                    extended_x1 = max(int(px1 - BBOX_EXTENSION_FOR_WPN_ASSOC*w), 0)
                    extended_x2 = min(int(px1 + (1 + BBOX_EXTENSION_FOR_WPN_ASSOC)*w), annotated_frame_width)
                    extended_y1 = max(int(py1 - 0*h), 0) #TODO
                    extended_y2 = min(int(py1 + (1 + 0)*h), annotated_frame_height)
                    # Check if weapon center is inside person's EXTENDED bounding box
                    if (extended_x1 < weapon_center[0] < extended_x2) and (extended_y1 < weapon_center[1] < extended_y2) and (track.track_id not in current_shooters_dict):
                        pixel_x, pixel_y, real_x, real_y = track.position
                        current_shooters_dict[track.track_id] = current_shooter_class(track.track_id, real_x, real_y, pixel_x, pixel_y, video_num)
                        print(f"weapon detected in video {video_num}, associated to id {track.track_id}, frame {frame_number}")
                        
                        if True:
                        #send image, Note it is expanded for visualization
                            w = px2 - px1
                            h = py2 - py1
                            annotated_frame = annotated_frames[video_num]
                            annotated_frame_width = annotated_frame.shape[1]
                            extended_x1 = max(int(px1 - EXTENDED_BBOX_WIDTH*w), 0)
                            extended_x2 = min(int(px1 + (1 + EXTENDED_BBOX_WIDTH)*w), annotated_frame_width)
                            extended_y1 = max(int(py1 - EXTENDED_BBOX_HEIGHT*h), 0) 
                            extended_y2 = min(int(py1 + (1 + EXTENDED_BBOX_HEIGHT)*h), annotated_frame_height)
                            snapshot = annotated_frame[int(extended_y1):int(extended_y2), int(extended_x1):int(extended_x2)].copy()

                            post_db_time_start = time.time() 

                            send_shooter_image_artur(snapshot)

                            post_db_time += time.time() - post_db_time_start

        # ---------------------- DISPLAY BBOXES AND ROIS ----------------------

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
                patches = patches_list[video_num]
                for patch in patches:
                    _, roi = patch
                    x1, y1, x2, y2 = roi
                    cv2.rectangle(annotated_frame, (int(x1), int(y1)), (int(x2), int(y2)), COLOR_BLUE, 2)

        # ---------------------- DISPLAY TRACKS ----------------------

        for video_num, track_outputs in enumerate(track_outputs_list):
            for t in track_outputs:
                tlwh = t.tlwh  
                track_id = t.track_id
                pixel_x, pixel_y, real_x, real_y = t.position

                x1, y1, w, h = tlwh
                x2, y2 = x1 + w, y1 + h
                #display bbox
                if track_id in current_shooters_dict:
                    bbox_color = COLOR_RED
                else:
                    bbox_color = COLOR_GREEN
                if DISPLAY_TRACKS:
                    cv2.rectangle(annotated_frames[video_num], (int(x1), int(y1)), (int(x2), int(y2)), bbox_color, 2)                    
                    cv2.putText(annotated_frames[video_num], f"ID: {track_id}", (int(x1), int(y1) - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, bbox_color, 2)
                    if track_id in current_shooters_dict:
                        cv2.putText(annotated_frames[video_num], f"THREAT", (int(x1) + 50, int(y1) - 5),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, bbox_color, 2)
                
                if DISPLAY_COM:
                    cv2.circle(annotated_frames[video_num], (int(pixel_x), int(pixel_y)), 5, bbox_color, -1)
                    x_real, y_real = find_real_coords(int(pixel_x), int(pixel_y), video_num, H_list)
                    cv2.putText(annotated_frames[video_num], f"{real_x:.2f}, {real_y:.2f}", (int(pixel_x) - 20, int(pixel_y) - 20), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, bbox_color, 2, cv2.LINE_AA)
                        
        # ---------------------- DISPLAY SHOOTER MEMORY ----------------------
        if DISPLAY_LOST_SHOOTER_POSITIONS:
            for id, lost_shooter in lost_shooters_dict.items():
                real_x, real_y, pixel_x, pixel_y, last_camera_seen = lost_shooter.get_coord_data()
                frames_since_seen = lost_shooter.frames_since_seen
                if frames_since_seen < MAX_FRAMES_SINCE_SEEN - 1:
                    bbox_color = COLOR_RED
                    cv2.circle(annotated_frames[last_camera_seen], (int(pixel_x), int(pixel_y)), 5, bbox_color, -1)
                    x_real, y_real = find_real_coords(int(pixel_x), int(pixel_y), last_camera_seen, H_list)
                    cv2.putText(annotated_frames[last_camera_seen], f"ID: {id}, t: {frames_since_seen}, {real_x:.1f}, {real_y:.1f}", (int(pixel_x) + 10, int(pixel_y) + 10), 
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, bbox_color, 2, cv2.LINE_AA)

        # ---------------------- SEND COORDINATES TO DB ----------------------
        if frame_number % (FRAMES_PER_ITER * 5) == 0:
            post_db_time_start = time.time()

            current_shooter_list = []
            for _, current_shooter in current_shooters_dict.items():
                current_shooter_list.append(current_shooter)

            send_current_shooter_coords(current_shooter_list)

            lost_shooter_list = []
            for _, lost_shooter in lost_shooters_dict.items():
                lost_shooter_list.append(lost_shooter)
                
            send_lost_shooter_coords(lost_shooter_list)

            post_db_time += time.time() - post_db_time_start
                                
        # ---------------------- WRITE VIDEO ----------------------

        video_process_start_time = time.time()

        cv2.putText(annotated_frames[0], f"THR: {dynamic_weapon_conf_thr}", (50, 50), 
                            cv2.FONT_HERSHEY_SIMPLEX, 1, COLOR_RED, 2, cv2.LINE_AA)
        for i, out in enumerate(outs):
            out.write(annotated_frames[i])

        video_process_time += time.time() - video_process_start_time

        # ---------------------- CREATE COLLAGE ---------------------- 
        collage_process_start_time = time.time()

        resized = [cv2.resize(f, target_size) for f in annotated_frames]
        row1 = np.hstack([resized[0], resized[0], resized[1]])
        row2 = np.hstack(resized[2:])
        collage = np.vstack([row1, row2])

        out_collage.write(collage)

        collage_process_time += time.time() - collage_process_start_time

        #Update frame counter and loop
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

print(f"total execution time in video processing: {(video_process_time/60.0):.2f} minutes")

print(f"total execution time in collage creation: {(collage_process_time/60.0):.2f} minutes")

print(f"total execution time in DB: {(post_db_time/60.0):.2f} minutes")
